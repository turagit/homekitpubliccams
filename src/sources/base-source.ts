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

export interface SourceAdapter {
  getSourceInfo(): SourceInfo;
  refreshIndex(): Promise<SourceAsset[]>;
}
