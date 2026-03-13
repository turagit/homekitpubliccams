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

export abstract class BaseSourceAdapter implements SourceAdapter {
  protected readonly http: HttpClient;
  protected readonly apiKey: string;

  constructor(apiKey?: string) {
    this.http = new HttpClient();
    this.apiKey = apiKey || 'DEMO_KEY';
  }

  abstract getSourceInfo(): SourceInfo;
  abstract refreshIndex(): Promise<SourceAsset[]>;

  public validateConfig(_config: CameraConfig): ValidationResult {
    return { valid: true, issues: [] };
  }

  protected nasaApiUrl(endpoint: string, params: Record<string, string> = {}): string {
    const url = new URL(endpoint, 'https://api.nasa.gov');
    url.searchParams.set('api_key', this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }
}
