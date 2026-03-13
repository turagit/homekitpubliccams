import fs from 'node:fs';
import { FrameProvider } from './stream-controller';

/**
 * Provides snapshot images from the current frame on disk.
 * Used by the streaming delegate for HomeKit snapshot requests,
 * and can be used independently for diagnostics.
 */
export class SnapshotProvider implements FrameProvider {
  private currentFramePath?: string;

  public setCurrentFrame(path: string): void {
    this.currentFramePath = path;
  }

  public getCurrentFramePath(): string | undefined {
    return this.currentFramePath;
  }

  public async getCurrentSnapshot(): Promise<Buffer | undefined> {
    if (!this.currentFramePath) {
      return undefined;
    }
    try {
      return await fs.promises.readFile(this.currentFramePath);
    } catch {
      return undefined;
    }
  }
}
