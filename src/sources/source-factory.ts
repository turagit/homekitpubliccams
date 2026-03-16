import { CameraConfig } from '../config/types';
import { SourceAdapter } from './base-source';
import { MslRawSource } from './msl-raw-source';

export function createSourceAdapter(cameraConfig: CameraConfig): SourceAdapter {
  return new MslRawSource(cameraConfig.sourceType);
}
