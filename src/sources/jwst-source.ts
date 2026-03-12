import { SourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class JwstSource implements SourceAdapter {
  public getSourceInfo(): SourceInfo {
    return { id: 'jwst', title: 'JWST', recommendedRefreshIntervalSec: 7200 };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    return [];
  }
}
