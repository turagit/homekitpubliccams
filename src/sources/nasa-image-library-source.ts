import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class NasaImageLibrarySource extends BaseSourceAdapter {
  public getSourceInfo(): SourceInfo {
    return {
      id: 'nasa-mixed',
      title: 'NASA Mixed Feed',
      recommendedRefreshIntervalSec: 1800,
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    // Foundation implementation: adapter contract and normalized return shape only.
    return [];
  }
}
