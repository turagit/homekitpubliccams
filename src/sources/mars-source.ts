import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class MarsSource extends BaseSourceAdapter {
  constructor(private readonly rover: 'curiosity' | 'perseverance') {
    super();
  }

  public getSourceInfo(): SourceInfo {
    return {
      id: this.rover,
      title: this.rover === 'curiosity' ? 'Curiosity Rover' : 'Perseverance Rover',
      recommendedRefreshIntervalSec: 900,
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    return [];
  }
}
