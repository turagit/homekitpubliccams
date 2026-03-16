import { CameraConfig } from '../config/types';
import { SourceAdapter } from './base-source';
import { M20RawSource } from './m20-raw-source';
import { MslRawSource } from './msl-raw-source';

export function createSourceAdapter(cameraConfig: CameraConfig): SourceAdapter {
  const { sourceType } = cameraConfig;
  if (sourceType.startsWith('m20-')) {
    return new M20RawSource(sourceType);
  }
  return new MslRawSource(sourceType);
}
