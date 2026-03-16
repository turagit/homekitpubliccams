import { CameraConfig } from '../config/types';
import { HttpClient } from '../net/http-client';
export interface SourceInfo {
    id: string;
    title: string;
    recommendedRefreshIntervalSec: number;
}
export interface SourceAsset {
    id: string;
    sourceId: string;
    title: string;
    canonicalUrl: string;
    imageUrl: string;
    publishedDate?: string;
    description?: string;
    credits?: string;
    width?: number;
    height?: number;
}
export interface ValidationResult {
    valid: boolean;
    issues: string[];
}
export interface SourceAdapter {
    getSourceInfo(): SourceInfo;
    refreshIndex(): Promise<SourceAsset[]>;
    validateConfig(config: CameraConfig): ValidationResult;
}
export declare abstract class BaseSourceAdapter implements SourceAdapter {
    protected readonly http: HttpClient;
    constructor();
    abstract getSourceInfo(): SourceInfo;
    abstract refreshIndex(): Promise<SourceAsset[]>;
    validateConfig(_config: CameraConfig): ValidationResult;
}
