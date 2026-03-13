import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';
export declare class JwstSource extends BaseSourceAdapter {
    constructor(apiKey?: string);
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
}
