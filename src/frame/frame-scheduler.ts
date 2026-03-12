export type FrameOrderMode = 'sequential' | 'shuffle' | 'newest-first';

export interface FrameSchedulerOptions {
  frameIntervalSec: number;
  mode: FrameOrderMode;
}

export class FrameScheduler {
  private cursor = 0;

  constructor(private readonly options: FrameSchedulerOptions) {}

  public nextIndex(length: number): number {
    if (length <= 0) {
      return -1;
    }

    if (this.options.mode === 'shuffle') {
      return Math.floor(Math.random() * length);
    }

    if (this.options.mode === 'newest-first') {
      return 0;
    }

    const index = this.cursor % length;
    this.cursor += 1;
    return index;
  }

  public getFrameIntervalMs(): number {
    return Math.max(1, this.options.frameIntervalSec) * 1000;
  }

  public reset(): void {
    this.cursor = 0;
  }
}
