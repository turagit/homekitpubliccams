export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type SourceType =
  | 'msl-front'
  | 'msl-rear'
  | 'msl-left'
  | 'msl-right'
  | 'm20-front-left'
  | 'm20-front-right';

export interface CameraConfig {
  enabled: boolean;
  sourceType: SourceType;
  name: string;
  frameIntervalSec: number;
  refreshIntervalSec: number;
  maxCacheItems: number;
  maxDiskMb: number;
  shuffle: boolean;
  retainLastGood: boolean;
  preferLandscape: boolean;
  minWidth?: number;
  minHeight?: number;
  overlayEnabled?: boolean;
  overlayFields?: string[];
}

export interface PlatformConfig {
  platform: string;
  name: string;
  enabled?: boolean;
  logLevel?: LogLevel;
  storagePath?: string;
  defaultFrameIntervalSec?: number;
  defaultRefreshIntervalSec?: number;
  maxConcurrentDownloads?: number;
  globalDiskLimitMb?: number;
  cameras?: CameraConfig[];
}
