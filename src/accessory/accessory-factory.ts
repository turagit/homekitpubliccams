import type { CameraSourceConfig } from '../config/types';
import { createSourceAdapter, type SourceAdapter } from '../sources/base-source';

export interface CameraAccessory {
  sourceAdapter: SourceAdapter;
}

export function createCameraAccessory(config: CameraSourceConfig): CameraAccessory {
  const sourceAdapter = createSourceAdapter(config);

  return {
    sourceAdapter,
  };
}
