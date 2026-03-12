import { CameraConfig } from '../config/types';

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

export abstract class BaseSourceAdapter implements SourceAdapter {
  abstract getSourceInfo(): SourceInfo;

  abstract refreshIndex(): Promise<SourceAsset[]>;

  public validateConfig(_config: CameraConfig): ValidationResult {
    return { valid: true, issues: [] };
  }
}
