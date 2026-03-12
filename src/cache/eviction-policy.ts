import { CachedAsset } from './cache-index';

export function removeInvalidAssets(assets: CachedAsset[]): CachedAsset[] {
  return assets.filter((asset) => asset.isValid);
}

export function sortByNewest(assets: CachedAsset[]): CachedAsset[] {
  return [...assets].sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
}

export function evictOldest(assets: CachedAsset[], maxItems: number): CachedAsset[] {
  if (maxItems <= 0) {
    return [];
  }

  const newestFirst = sortByNewest(assets);
  return newestFirst.slice(0, maxItems);
}
