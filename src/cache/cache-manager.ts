import fs from 'node:fs';
import path from 'node:path';
import { CacheIndex, CachedAsset } from './cache-index';
import { evictOldest, removeInvalidAssets, sortByNewest } from './eviction-policy';

export class CacheManager {
  private readonly indexes = new Map<string, CacheIndex>();

  constructor(private readonly basePath: string) {}

  /** Load index from disk for a given source on startup. */
  public async loadIndex(sourceId: string): Promise<CacheIndex> {
    const indexPath = this.indexFilePath(sourceId);
    try {
      const raw = await fs.promises.readFile(indexPath, 'utf-8');
      const index = JSON.parse(raw) as CacheIndex;
      // Validate that cached files still exist on disk
      const verified: CachedAsset[] = [];
      for (const asset of index.assets) {
        try {
          await fs.promises.access(asset.localPath, fs.constants.R_OK);
          verified.push(asset);
        } catch {
          // file missing — drop from index
        }
      }
      index.assets = verified;
      this.indexes.set(sourceId, index);
      return index;
    } catch {
      const fresh: CacheIndex = { sourceId, updatedAt: new Date().toISOString(), assets: [] };
      this.indexes.set(sourceId, fresh);
      return fresh;
    }
  }

  public getAssets(sourceId: string): CachedAsset[] {
    return this.indexes.get(sourceId)?.assets ?? [];
  }

  public getIndex(sourceId: string): CacheIndex | undefined {
    return this.indexes.get(sourceId);
  }

  /** Returns true if an asset with this ID already exists in the cache. */
  public hasAsset(sourceId: string, assetId: string): boolean {
    const index = this.indexes.get(sourceId);
    if (!index) {
      return false;
    }
    return index.assets.some((a) => a.assetId === assetId);
  }

  /** Add a newly downloaded asset to the index and persist. */
  public async addAsset(sourceId: string, asset: CachedAsset, maxItems: number, maxDiskMb: number): Promise<void> {
    const index = this.indexes.get(sourceId) ?? { sourceId, updatedAt: new Date().toISOString(), assets: [] };
    index.assets.push(asset);
    index.assets = this.dedupeAssets(index.assets);
    index.assets = removeInvalidAssets(index.assets);

    // Evict by item count
    const evictedByCount = evictOldest(index.assets, maxItems);
    const toRemove = index.assets.filter((a) => !evictedByCount.includes(a));
    index.assets = evictedByCount;

    // Evict by disk size
    const maxBytes = maxDiskMb * 1024 * 1024;
    let totalBytes = index.assets.reduce((sum, a) => sum + a.byteSize, 0);
    const sorted = sortByNewest(index.assets);
    const kept: CachedAsset[] = [];
    for (const a of sorted) {
      if (totalBytes > maxBytes && kept.length > 0) {
        toRemove.push(a);
        totalBytes -= a.byteSize;
      } else {
        kept.push(a);
      }
    }
    index.assets = kept;

    index.updatedAt = new Date().toISOString();
    this.indexes.set(sourceId, index);

    // Delete evicted files from disk
    for (const removed of toRemove) {
      try {
        await fs.promises.unlink(removed.localPath);
      } catch {
        // ignore missing files
      }
    }

    await this.persistIndex(sourceId, index);
  }

  /** Get the directory where assets for a source should be stored. */
  public assetsDir(sourceId: string): string {
    return path.join(this.basePath, 'sources', sourceId, 'assets');
  }

  /** Ensure the cache directories exist for a source. */
  public async ensureDirs(sourceId: string): Promise<void> {
    await fs.promises.mkdir(this.assetsDir(sourceId), { recursive: true });
  }

  /** Clean up temp/partial download files on startup. */
  public async cleanupTempFiles(sourceId: string): Promise<void> {
    const dir = this.assetsDir(sourceId);
    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        if (file.startsWith('.download-')) {
          try {
            await fs.promises.unlink(path.join(dir, file));
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // directory might not exist yet
    }
  }

  private indexFilePath(sourceId: string): string {
    return path.join(this.basePath, 'sources', sourceId, 'index.json');
  }

  private async persistIndex(sourceId: string, index: CacheIndex): Promise<void> {
    const filePath = this.indexFilePath(sourceId);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(index, null, 2), 'utf-8');
  }

  private dedupeAssets(assets: CachedAsset[]): CachedAsset[] {
    const byAssetId = new Map<string, CachedAsset>();
    for (const asset of sortByNewest(assets)) {
      if (!byAssetId.has(asset.assetId)) {
        byAssetId.set(asset.assetId, asset);
      }
    }
    return [...byAssetId.values()];
  }
}
