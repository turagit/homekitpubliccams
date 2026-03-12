export interface FrameSchedulerOptions {
  frameIntervalSec: number;
  shuffle: boolean;
}

export class FrameScheduler {
  private cursor = 0;

  constructor(private readonly options: FrameSchedulerOptions) {}

  public nextIndex(length: number): number {
    if (length <= 0) {
      return -1;
    }

    if (this.options.shuffle) {
      return Math.floor(Math.random() * length);
    }

    const index = this.cursor % length;
    this.cursor += 1;
    return index;
  }
}
