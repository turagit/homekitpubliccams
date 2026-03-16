"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicSpaceCamPlatform = void 0;
const node_path_1 = __importDefault(require("node:path"));
const accessory_factory_1 = require("./accessory/accessory-factory");
const validation_1 = require("./config/validation");
const cache_manager_1 = require("./cache/cache-manager");
const source_factory_1 = require("./sources/source-factory");
const downloader_1 = require("./net/downloader");
const image_validator_1 = require("./image/image-validator");
const frame_scheduler_1 = require("./frame/frame-scheduler");
const diagnostics_1 = require("./diag/diagnostics");
const settings_1 = require("./settings");
class PublicSpaceCamPlatform {
    log;
    api;
    Service;
    Characteristic;
    accessories = new Map();
    pluginName = settings_1.PLUGIN_NAME;
    platformName = settings_1.PLATFORM_NAME;
    parsedConfig;
    accessoryFactory;
    cacheManager;
    downloader;
    imageValidator;
    diagnostics;
    runtimes = new Map();
    storagePath;
    constructor(log, config, api) {
        this.log = log;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        const { value, warnings } = (0, validation_1.validateConfig)(config);
        this.parsedConfig = value;
        this.accessoryFactory = new accessory_factory_1.AccessoryFactory(this);
        this.downloader = new downloader_1.Downloader();
        this.imageValidator = new image_validator_1.ImageValidator();
        this.diagnostics = new diagnostics_1.DiagnosticsStore();
        this.storagePath = this.parsedConfig.storagePath
            || node_path_1.default.join(this.api.user.storagePath(), 'public-spacecam');
        this.cacheManager = new cache_manager_1.CacheManager(this.storagePath);
        warnings.forEach((warning) => this.log.warn(`[config] ${warning}`));
        this.api.on('didFinishLaunching', () => {
            this.log.info('Public SpaceCam platform launched.');
            this.syncAccessories().catch((err) => {
                this.log.error(`Failed to sync accessories: ${err}`);
            });
        });
        this.api.on('shutdown', () => {
            this.shutdown();
        });
    }
    configureAccessory(accessory) {
        this.accessories.set(accessory.UUID, accessory);
    }
    async syncAccessories() {
        if (this.parsedConfig.enabled === false) {
            this.log.warn('Plugin disabled via configuration; removing existing accessories.');
            for (const accessory of this.accessories.values()) {
                this.accessoryFactory.removeAccessory(accessory);
            }
            return;
        }
        const enabledCameras = (this.parsedConfig.cameras ?? []).filter((camera) => camera.enabled);
        const expectedUuids = new Set();
        for (const cameraConfig of enabledCameras) {
            const source = (0, source_factory_1.createSourceAdapter)(cameraConfig);
            const validation = source.validateConfig(cameraConfig);
            if (!validation.valid) {
                this.log.warn(`Skipping camera source ${cameraConfig.name}: ${validation.issues.join('; ')}`);
                continue;
            }
            const accessory = this.accessoryFactory.upsertCamera(cameraConfig);
            const uuid = accessory.UUID;
            expectedUuids.add(uuid);
            const sourceInfo = source.getSourceInfo();
            this.log.info(`Configured: ${cameraConfig.name} (${cameraConfig.sourceType}), refresh every ${cameraConfig.refreshIntervalSec}s`);
            // Initialize cache for this source
            await this.cacheManager.ensureDirs(sourceInfo.id);
            await this.cacheManager.cleanupTempFiles(sourceInfo.id);
            await this.cacheManager.loadIndex(sourceInfo.id);
            // Set up frame scheduler
            const mode = cameraConfig.shuffle ? 'shuffle' : 'sequential';
            const frameScheduler = new frame_scheduler_1.FrameScheduler({
                frameIntervalSec: cameraConfig.frameIntervalSec,
                mode,
            });
            const runtime = {
                config: cameraConfig,
                sourceAdapter: source,
                frameScheduler,
                uuid,
            };
            this.runtimes.set(uuid, runtime);
            // Start refresh and frame loops
            this.startRefreshLoop(runtime);
            this.startFrameLoop(runtime);
            // Do an initial refresh immediately
            this.refreshSource(runtime).catch((err) => {
                this.log.warn(`[${cameraConfig.name}] Initial refresh failed: ${err}`);
            });
        }
        // Remove stale accessories
        for (const accessory of [...this.accessories.values()]) {
            if (!expectedUuids.has(accessory.UUID)) {
                this.log.info(`Removing stale accessory: ${accessory.displayName}`);
                const runtime = this.runtimes.get(accessory.UUID);
                if (runtime) {
                    this.stopRuntime(runtime);
                    this.runtimes.delete(accessory.UUID);
                }
                this.accessoryFactory.removeAccessory(accessory);
            }
        }
    }
    startRefreshLoop(runtime) {
        const intervalMs = runtime.config.refreshIntervalSec * 1000;
        runtime.refreshTimer = setInterval(() => {
            this.refreshSource(runtime).catch((err) => {
                this.log.warn(`[${runtime.config.name}] Refresh failed: ${err}`);
            });
        }, intervalMs);
    }
    startFrameLoop(runtime) {
        const intervalMs = runtime.frameScheduler.getFrameIntervalMs();
        runtime.frameTimer = setInterval(() => {
            this.advanceFrame(runtime);
        }, intervalMs);
    }
    async refreshSource(runtime) {
        const { config, sourceAdapter } = runtime;
        const sourceId = sourceAdapter.getSourceInfo().id;
        this.log.debug(`[${config.name}] Refreshing source index...`);
        this.diagnostics.set({
            sourceId,
            lastRefreshAt: new Date().toISOString(),
            cachedItems: this.cacheManager.getAssets(sourceId).length,
        });
        let assets;
        try {
            assets = await sourceAdapter.refreshIndex();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log.warn(`[${config.name}] Source refresh error: ${msg}`);
            this.diagnostics.set({
                sourceId,
                lastRefreshAt: new Date().toISOString(),
                cachedItems: this.cacheManager.getAssets(sourceId).length,
                lastError: msg,
            });
            return; // Keep serving cached images
        }
        this.log.info(`[${config.name}] Got ${assets.length} assets from source`);
        // Download new assets that aren't already cached
        let downloaded = 0;
        const maxConcurrent = this.parsedConfig.maxConcurrentDownloads ?? 2;
        // Process in batches
        for (let i = 0; i < assets.length; i += maxConcurrent) {
            const batch = assets.slice(i, i + maxConcurrent);
            const downloadPromises = batch.map(async (asset) => {
                if (this.cacheManager.hasAsset(sourceId, asset.id)) {
                    return; // Already cached
                }
                const ext = this.guessExtension(asset.imageUrl);
                const targetPath = node_path_1.default.join(this.cacheManager.assetsDir(sourceId), `${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`);
                try {
                    const result = await this.downloader.download(asset.imageUrl, targetPath);
                    if (!result.success) {
                        this.log.warn(`[${config.name}] Download failed for ${asset.id}: ${result.error} (url: ${asset.imageUrl})`);
                        return;
                    }
                    const isValid = await this.imageValidator.isValidImage(targetPath);
                    if (!isValid) {
                        this.log.warn(`[${config.name}] Invalid image: ${asset.id} (url: ${asset.imageUrl})`);
                        try {
                            const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
                            await fs.promises.unlink(targetPath);
                        }
                        catch { /* ignore */ }
                        return;
                    }
                    const cachedAsset = {
                        assetId: asset.id,
                        sourceId,
                        localPath: targetPath,
                        downloadedAt: new Date().toISOString(),
                        byteSize: result.byteSize,
                        isValid: true,
                    };
                    await this.cacheManager.addAsset(sourceId, cachedAsset, config.maxCacheItems, config.maxDiskMb);
                    downloaded++;
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.log.warn(`[${config.name}] Error downloading ${asset.id}: ${msg}`);
                }
            });
            await Promise.all(downloadPromises);
        }
        const cachedCount = this.cacheManager.getAssets(sourceId).length;
        this.log.info(`[${config.name}] Downloaded ${downloaded} new assets, ${cachedCount} total cached`);
        this.diagnostics.set({
            sourceId,
            lastRefreshAt: new Date().toISOString(),
            lastSuccessAt: new Date().toISOString(),
            cachedItems: cachedCount,
        });
        // Update frame immediately if this is the first refresh
        this.advanceFrame(runtime);
    }
    advanceFrame(runtime) {
        const sourceId = runtime.sourceAdapter.getSourceInfo().id;
        const assets = this.cacheManager.getAssets(sourceId);
        if (assets.length === 0) {
            return;
        }
        const index = runtime.frameScheduler.nextIndex(assets.length);
        if (index < 0 || index >= assets.length) {
            return;
        }
        const asset = assets[index];
        const cam = this.accessoryFactory.getCameraAccessory(runtime.uuid);
        if (cam) {
            cam.snapshotProvider.setCurrentFrame(asset.localPath);
        }
    }
    guessExtension(url) {
        const lower = url.toLowerCase();
        if (lower.includes('.png'))
            return '.png';
        if (lower.includes('.gif'))
            return '.gif';
        if (lower.includes('.webp'))
            return '.webp';
        if (lower.includes('.tif'))
            return '.tif';
        return '.jpg';
    }
    stopRuntime(runtime) {
        if (runtime.refreshTimer) {
            clearInterval(runtime.refreshTimer);
        }
        if (runtime.frameTimer) {
            clearInterval(runtime.frameTimer);
        }
    }
    shutdown() {
        for (const runtime of this.runtimes.values()) {
            this.stopRuntime(runtime);
        }
        this.runtimes.clear();
    }
}
exports.PublicSpaceCamPlatform = PublicSpaceCamPlatform;
