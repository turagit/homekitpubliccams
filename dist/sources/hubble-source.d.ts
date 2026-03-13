import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';
export declare class HubbleSource extends BaseSourceAdapter {
    constructor(apiKey?: string);
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
    private fetchFromHubbleSite;
    private fetchFromNasaLibrary;
}
