import { CacheIndex, CachedAsset } from './cache-index';
import { evictOldest, removeInvalidAssets, sortByNewest } from './eviction-policy';

export class CacheManager {
  private readonly indexes = new Map<string, CacheIndex>();

  public getAssets(sourceId: string): CachedAsset[] {
    return this.indexes.get(sourceId)?.assets ?? [];
  }

  public getIndex(sourceId: string): CacheIndex | undefined {
    return this.indexes.get(sourceId);
  }

  public update(sourceId: string, assets: CachedAsset[], maxItems: number): CacheIndex {
    const deduped = this.dedupeAssets(assets);
    const validOnly = removeInvalidAssets(deduped);
    const bounded = evictOldest(validOnly, maxItems);

    const index: CacheIndex = {
      sourceId,
      updatedAt: new Date().toISOString(),
      assets: bounded,
    };

    this.indexes.set(sourceId, index);
    return index;
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
