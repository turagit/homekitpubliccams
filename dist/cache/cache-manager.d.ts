import { CacheIndex, CachedAsset } from './cache-index';
export declare class CacheManager {
    private readonly basePath;
    private readonly indexes;
    constructor(basePath: string);
    /** Load index from disk for a given source on startup. */
    loadIndex(sourceId: string): Promise<CacheIndex>;
    getAssets(sourceId: string): CachedAsset[];
    getIndex(sourceId: string): CacheIndex | undefined;
    /** Returns true if an asset with this ID already exists in the cache. */
    hasAsset(sourceId: string, assetId: string): boolean;
    /** Add a newly downloaded asset to the index and persist. */
    addAsset(sourceId: string, asset: CachedAsset, maxItems: number, maxDiskMb: number): Promise<void>;
    /** Get the directory where assets for a source should be stored. */
    assetsDir(sourceId: string): string;
    /** Ensure the cache directories exist for a source. */
    ensureDirs(sourceId: string): Promise<void>;
    /** Clean up temp/partial download files on startup. */
    cleanupTempFiles(sourceId: string): Promise<void>;
    private indexFilePath;
    private persistIndex;
    private dedupeAssets;
}
