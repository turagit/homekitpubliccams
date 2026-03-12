import { SourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class ApodSource implements SourceAdapter {
  public getSourceInfo(): SourceInfo {
    return {
      id: 'apod',
      title: 'Astronomy Picture of the Day',
      recommendedRefreshIntervalSec: 21600,
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    return [];
  }
}
