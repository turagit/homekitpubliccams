import { CachedAsset } from './cache-index';

export function evictOldest(assets: CachedAsset[], maxItems: number): CachedAsset[] {
  const valid = [...assets].sort((a, b) => a.downloadedAt.localeCompare(b.downloadedAt));
  if (valid.length <= maxItems) {
    return valid;
  }
  return valid.slice(valid.length - maxItems);
}
