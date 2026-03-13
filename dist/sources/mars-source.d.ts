import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';
export declare class MarsSource extends BaseSourceAdapter {
    private readonly rover;
    constructor(rover: 'curiosity' | 'perseverance', apiKey?: string);
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
    /** Pick photos from different cameras to get visual variety. */
    private selectDiversePhotos;
}
