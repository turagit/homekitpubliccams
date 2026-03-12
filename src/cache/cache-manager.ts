import { CacheIndex, CachedAsset } from './cache-index';
import { evictOldest } from './eviction-policy';

export class CacheManager {
  private readonly indexes = new Map<string, CacheIndex>();

  public getAssets(sourceId: string): CachedAsset[] {
    return this.indexes.get(sourceId)?.assets ?? [];
  }

  public update(sourceId: string, assets: CachedAsset[], maxItems: number): CacheIndex {
    const bounded = evictOldest(assets, maxItems);
    const index: CacheIndex = {
      sourceId,
      updatedAt: new Date().toISOString(),
      assets: bounded,
    };
    this.indexes.set(sourceId, index);
    return index;
  }
}
