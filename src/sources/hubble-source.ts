import { SourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class HubbleSource implements SourceAdapter {
  public getSourceInfo(): SourceInfo {
    return { id: 'hubble', title: 'Hubble', recommendedRefreshIntervalSec: 7200 };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    return [];
  }
}
