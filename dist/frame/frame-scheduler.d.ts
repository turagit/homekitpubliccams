export type FrameOrderMode = 'sequential' | 'shuffle' | 'newest-first';
export interface FrameSchedulerOptions {
    frameIntervalSec: number;
    mode: FrameOrderMode;
}
export declare class FrameScheduler {
    private readonly options;
    private cursor;
    constructor(options: FrameSchedulerOptions);
    nextIndex(length: number): number;
    getFrameIntervalMs(): number;
    reset(): void;
}
