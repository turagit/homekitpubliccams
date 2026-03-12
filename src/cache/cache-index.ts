export interface CachedAsset {
  assetId: string;
  sourceId: string;
  localPath: string;
  downloadedAt: string;
  byteSize: number;
  width?: number;
  height?: number;
  isValid: boolean;
}

export interface CacheIndex {
  sourceId: string;
  updatedAt: string;
  assets: CachedAsset[];
}
