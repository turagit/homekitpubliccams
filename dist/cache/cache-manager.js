"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const eviction_policy_1 = require("./eviction-policy");
class CacheManager {
    basePath;
    indexes = new Map();
    constructor(basePath) {
        this.basePath = basePath;
    }
    /** Load index from disk for a given source on startup. */
    async loadIndex(sourceId) {
        const indexPath = this.indexFilePath(sourceId);
        try {
            const raw = await node_fs_1.default.promises.readFile(indexPath, 'utf-8');
            const index = JSON.parse(raw);
            // Validate that cached files still exist on disk
            const verified = [];
            for (const asset of index.assets) {
                try {
                    await node_fs_1.default.promises.access(asset.localPath, node_fs_1.default.constants.R_OK);
                    verified.push(asset);
                }
                catch {
                    // file missing — drop from index
                }
            }
            index.assets = verified;
            this.indexes.set(sourceId, index);
            return index;
        }
        catch {
            const fresh = { sourceId, updatedAt: new Date().toISOString(), assets: [] };
            this.indexes.set(sourceId, fresh);
            return fresh;
        }
    }
    getAssets(sourceId) {
        return this.indexes.get(sourceId)?.assets ?? [];
    }
    getIndex(sourceId) {
        return this.indexes.get(sourceId);
    }
    /** Returns true if an asset with this ID already exists in the cache. */
    hasAsset(sourceId, assetId) {
        const index = this.indexes.get(sourceId);
        if (!index) {
            return false;
        }
        return index.assets.some((a) => a.assetId === assetId);
    }
    /** Add a newly downloaded asset to the index and persist. */
    async addAsset(sourceId, asset, maxItems, maxDiskMb) {
        const index = this.indexes.get(sourceId) ?? { sourceId, updatedAt: new Date().toISOString(), assets: [] };
        index.assets.push(asset);
        index.assets = this.dedupeAssets(index.assets);
        index.assets = (0, eviction_policy_1.removeInvalidAssets)(index.assets);
        // Evict by item count
        const evictedByCount = (0, eviction_policy_1.evictOldest)(index.assets, maxItems);
        const toRemove = index.assets.filter((a) => !evictedByCount.includes(a));
        index.assets = evictedByCount;
        // Evict by disk size
        const maxBytes = maxDiskMb * 1024 * 1024;
        let totalBytes = index.assets.reduce((sum, a) => sum + a.byteSize, 0);
        const sorted = (0, eviction_policy_1.sortByNewest)(index.assets);
        const kept = [];
        for (const a of sorted) {
            if (totalBytes > maxBytes && kept.length > 0) {
                toRemove.push(a);
                totalBytes -= a.byteSize;
            }
            else {
                kept.push(a);
            }
        }
        index.assets = kept;
        index.updatedAt = new Date().toISOString();
        this.indexes.set(sourceId, index);
        // Delete evicted files from disk
        for (const removed of toRemove) {
            try {
                await node_fs_1.default.promises.unlink(removed.localPath);
            }
            catch {
                // ignore missing files
            }
        }
        await this.persistIndex(sourceId, index);
    }
    /** Get the directory where assets for a source should be stored. */
    assetsDir(sourceId) {
        return node_path_1.default.join(this.basePath, 'sources', sourceId, 'assets');
    }
    /** Ensure the cache directories exist for a source. */
    async ensureDirs(sourceId) {
        await node_fs_1.default.promises.mkdir(this.assetsDir(sourceId), { recursive: true });
    }
    /** Clean up temp/partial download files on startup. */
    async cleanupTempFiles(sourceId) {
        const dir = this.assetsDir(sourceId);
        try {
            const files = await node_fs_1.default.promises.readdir(dir);
            for (const file of files) {
                if (file.startsWith('.download-')) {
                    try {
                        await node_fs_1.default.promises.unlink(node_path_1.default.join(dir, file));
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        catch {
            // directory might not exist yet
        }
    }
    indexFilePath(sourceId) {
        return node_path_1.default.join(this.basePath, 'sources', sourceId, 'index.json');
    }
    async persistIndex(sourceId, index) {
        const filePath = this.indexFilePath(sourceId);
        await node_fs_1.default.promises.mkdir(node_path_1.default.dirname(filePath), { recursive: true });
        await node_fs_1.default.promises.writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8');
    }
    dedupeAssets(assets) {
        const byAssetId = new Map();
        for (const asset of (0, eviction_policy_1.sortByNewest)(assets)) {
            if (!byAssetId.has(asset.assetId)) {
                byAssetId.set(asset.assetId, asset);
            }
        }
        return [...byAssetId.values()];
    }
}
exports.CacheManager = CacheManager;
