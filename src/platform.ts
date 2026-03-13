import path from 'node:path';
import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { AccessoryFactory } from './accessory/accessory-factory';
import { validateConfig } from './config/validation';
import { CameraConfig, PlatformConfig as SpaceCamPlatformConfig } from './config/types';
import { CacheManager } from './cache/cache-manager';
import { createSourceAdapter } from './sources/source-factory';
import { SourceAdapter, SourceAsset } from './sources/base-source';
import { Downloader } from './net/downloader';
import { ImageValidator } from './image/image-validator';
import { FrameScheduler, FrameOrderMode } from './frame/frame-scheduler';
import { DiagnosticsStore } from './diag/diagnostics';
import { CachedAsset } from './cache/cache-index';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

interface CameraRuntime {
  config: CameraConfig;
  sourceAdapter: SourceAdapter;
  frameScheduler: FrameScheduler;
  refreshTimer?: ReturnType<typeof setInterval>;
  frameTimer?: ReturnType<typeof setInterval>;
  uuid: string;
}

export class PublicSpaceCamPlatform implements DynamicPlatformPlugin {
  readonly Service: typeof Service;
  readonly Characteristic: typeof Characteristic;

  readonly accessories = new Map<string, PlatformAccessory>();
  readonly pluginName = PLUGIN_NAME;
  readonly platformName = PLATFORM_NAME;

  private readonly parsedConfig: SpaceCamPlatformConfig;
  private readonly accessoryFactory: AccessoryFactory;
  private readonly cacheManager: CacheManager;
  private readonly downloader: Downloader;
  private readonly imageValidator: ImageValidator;
  private readonly diagnostics: DiagnosticsStore;
  private readonly runtimes = new Map<string, CameraRuntime>();
  private readonly storagePath: string;

  constructor(
    readonly log: Logger,
    config: PlatformConfig,
    readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    const { value, warnings } = validateConfig(config as SpaceCamPlatformConfig);
    this.parsedConfig = value;
    this.accessoryFactory = new AccessoryFactory(this);
    this.downloader = new Downloader();
    this.imageValidator = new ImageValidator();
    this.diagnostics = new DiagnosticsStore();

    this.storagePath = this.parsedConfig.storagePath
      || path.join(this.api.user.storagePath(), 'public-spacecam');
    this.cacheManager = new CacheManager(this.storagePath);

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

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.set(accessory.UUID, accessory);
  }

  private async syncAccessories(): Promise<void> {
    if (this.parsedConfig.enabled === false) {
      this.log.warn('Plugin disabled via configuration; removing existing accessories.');
      for (const accessory of this.accessories.values()) {
        this.accessoryFactory.removeAccessory(accessory);
      }
      return;
    }

    const enabledCameras = (this.parsedConfig.cameras ?? []).filter((camera) => camera.enabled);
    const expectedUuids = new Set<string>();

    for (const cameraConfig of enabledCameras) {
      const source = createSourceAdapter(cameraConfig, this.parsedConfig.apiKey);
      const validation = source.validateConfig(cameraConfig);
      if (!validation.valid) {
        this.log.warn(`Skipping camera source ${cameraConfig.name}: ${validation.issues.join('; ')}`);
        continue;
      }

      const accessory = this.accessoryFactory.upsertCamera(cameraConfig);
      const uuid = accessory.UUID;
      expectedUuids.add(uuid);

      const sourceInfo = source.getSourceInfo();
      this.log.info(
        `Configured: ${cameraConfig.name} (${cameraConfig.sourceType}), refresh every ${cameraConfig.refreshIntervalSec}s`,
      );

      // Initialize cache for this source
      await this.cacheManager.ensureDirs(sourceInfo.id);
      await this.cacheManager.cleanupTempFiles(sourceInfo.id);
      await this.cacheManager.loadIndex(sourceInfo.id);

      // Set up frame scheduler
      const mode: FrameOrderMode = cameraConfig.shuffle ? 'shuffle' : 'sequential';
      const frameScheduler = new FrameScheduler({
        frameIntervalSec: cameraConfig.frameIntervalSec,
        mode,
      });

      const runtime: CameraRuntime = {
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

  private startRefreshLoop(runtime: CameraRuntime): void {
    const intervalMs = runtime.config.refreshIntervalSec * 1000;
    runtime.refreshTimer = setInterval(() => {
      this.refreshSource(runtime).catch((err) => {
        this.log.warn(`[${runtime.config.name}] Refresh failed: ${err}`);
      });
    }, intervalMs);
  }

  private startFrameLoop(runtime: CameraRuntime): void {
    const intervalMs = runtime.frameScheduler.getFrameIntervalMs();
    runtime.frameTimer = setInterval(() => {
      this.advanceFrame(runtime);
    }, intervalMs);
  }

  private async refreshSource(runtime: CameraRuntime): Promise<void> {
    const { config, sourceAdapter } = runtime;
    const sourceId = sourceAdapter.getSourceInfo().id;

    this.log.debug(`[${config.name}] Refreshing source index...`);
    this.diagnostics.set({
      sourceId,
      lastRefreshAt: new Date().toISOString(),
      cachedItems: this.cacheManager.getAssets(sourceId).length,
    });

    let assets: SourceAsset[];
    try {
      assets = await sourceAdapter.refreshIndex();
    } catch (err) {
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
        const targetPath = path.join(
          this.cacheManager.assetsDir(sourceId),
          `${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`,
        );

        try {
          const result = await this.downloader.download(asset.imageUrl, targetPath);
          if (!result.success) {
            this.log.debug(`[${config.name}] Download failed for ${asset.id}: ${result.error}`);
            return;
          }

          const isValid = await this.imageValidator.isValidImage(targetPath);
          if (!isValid) {
            this.log.debug(`[${config.name}] Invalid image: ${asset.id}`);
            try {
              const fs = await import('node:fs');
              await fs.promises.unlink(targetPath);
            } catch { /* ignore */ }
            return;
          }

          const cachedAsset: CachedAsset = {
            assetId: asset.id,
            sourceId,
            localPath: targetPath,
            downloadedAt: new Date().toISOString(),
            byteSize: result.byteSize,
            isValid: true,
          };

          await this.cacheManager.addAsset(
            sourceId,
            cachedAsset,
            config.maxCacheItems,
            config.maxDiskMb,
          );

          downloaded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.log.debug(`[${config.name}] Error downloading ${asset.id}: ${msg}`);
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

  private advanceFrame(runtime: CameraRuntime): void {
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

  private guessExtension(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('.png')) return '.png';
    if (lower.includes('.gif')) return '.gif';
    if (lower.includes('.webp')) return '.webp';
    if (lower.includes('.tif')) return '.tif';
    return '.jpg';
  }

  private stopRuntime(runtime: CameraRuntime): void {
    if (runtime.refreshTimer) {
      clearInterval(runtime.refreshTimer);
    }
    if (runtime.frameTimer) {
      clearInterval(runtime.frameTimer);
    }
  }

  private shutdown(): void {
    for (const runtime of this.runtimes.values()) {
      this.stopRuntime(runtime);
    }
    this.runtimes.clear();
  }
}
