import { CameraConfig } from '../config/types';
import { ApodSource } from './apod-source';
import { SourceAdapter } from './base-source';
import { HubbleSource } from './hubble-source';
import { JwstSource } from './jwst-source';
import { MarsSource } from './mars-source';
import { NasaImageLibrarySource } from './nasa-image-library-source';

export function createSourceAdapter(cameraConfig: CameraConfig, apiKey?: string): SourceAdapter {
  switch (cameraConfig.sourceType) {
    case 'apod':
      return new ApodSource(apiKey);
    case 'hubble':
      return new HubbleSource(apiKey);
    case 'jwst':
      return new JwstSource(apiKey);
    case 'curiosity':
    case 'perseverance':
      return new MarsSource(cameraConfig.sourceType, apiKey);
    case 'nasa-mixed':
    default:
      return new NasaImageLibrarySource(apiKey);
  }
}
