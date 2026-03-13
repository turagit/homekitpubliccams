import { CachedAsset } from './cache-index';
export declare function removeInvalidAssets(assets: CachedAsset[]): CachedAsset[];
export declare function sortByNewest(assets: CachedAsset[]): CachedAsset[];
export declare function evictOldest(assets: CachedAsset[], maxItems: number): CachedAsset[];
