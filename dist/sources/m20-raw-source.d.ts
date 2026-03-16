import { SourceType } from '../config/types';
import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';
export declare class M20RawSource extends BaseSourceAdapter {
    private readonly sourceType;
    private readonly instrument;
    private readonly sourceTitle;
    constructor(sourceType: SourceType);
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
}
