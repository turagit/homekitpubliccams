import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class HubbleSource extends BaseSourceAdapter {
  public getSourceInfo(): SourceInfo {
    return { id: 'hubble', title: 'Hubble', recommendedRefreshIntervalSec: 7200 };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    return [];
  }
}
