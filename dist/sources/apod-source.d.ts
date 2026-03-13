import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';
export declare class ApodSource extends BaseSourceAdapter {
    constructor(apiKey?: string);
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
}
