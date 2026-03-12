import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class ApodSource extends BaseSourceAdapter {
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
