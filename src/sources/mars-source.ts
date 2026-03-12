import { SourceAdapter, SourceAsset, SourceInfo } from './base-source';

export class MarsSource implements SourceAdapter {
  constructor(private readonly rover: 'curiosity' | 'perseverance') {}

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
