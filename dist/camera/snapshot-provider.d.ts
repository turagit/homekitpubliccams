import { FrameProvider } from './stream-controller';
/**
 * Provides snapshot images from the current frame on disk.
 * Used by the streaming delegate for HomeKit snapshot requests,
 * and can be used independently for diagnostics.
 */
export declare class SnapshotProvider implements FrameProvider {
    private currentFramePath?;
    setCurrentFrame(path: string): void;
    getCurrentFramePath(): string | undefined;
    getCurrentSnapshot(): Promise<Buffer | undefined>;
}
