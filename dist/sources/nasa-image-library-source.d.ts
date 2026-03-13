import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';
export declare class NasaImageLibrarySource extends BaseSourceAdapter {
    private readonly searchTerms;
    private termIndex;
    constructor(apiKey?: string);
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
}
