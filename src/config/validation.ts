import { CameraConfig, PlatformConfig, SourceType } from './types';

const SOURCE_TYPES: SourceType[] = ['curiosity', 'perseverance', 'jwst', 'hubble', 'apod', 'nasa-mixed'];

export interface ValidationResult<T> {
  value: T;
  warnings: string[];
}

const withDefaults = (config: PlatformConfig): PlatformConfig => ({
  ...config,
  enabled: config.enabled ?? true,
  logLevel: config.logLevel ?? 'info',
  defaultFrameIntervalSec: config.defaultFrameIntervalSec ?? 4,
  defaultRefreshIntervalSec: config.defaultRefreshIntervalSec ?? 900,
  maxConcurrentDownloads: config.maxConcurrentDownloads ?? 2,
  globalDiskLimitMb: config.globalDiskLimitMb ?? 1024,
  cameras: config.cameras ?? [],
});

export function validateConfig(config: PlatformConfig): ValidationResult<PlatformConfig> {
  const normalized = withDefaults(config);
  const warnings: string[] = [];

  normalized.cameras = normalized.cameras
    ?.filter((camera): camera is CameraConfig => {
      if (!camera?.name || !SOURCE_TYPES.includes(camera.sourceType)) {
        warnings.push(`Skipping invalid camera entry: ${JSON.stringify(camera)}`);
        return false;
      }
      return true;
    })
    .map((camera) => {
      const frameIntervalSec = Math.max(1, camera.frameIntervalSec ?? normalized.defaultFrameIntervalSec ?? 4);
      const refreshIntervalSec = Math.max(300, camera.refreshIntervalSec ?? normalized.defaultRefreshIntervalSec ?? 900);
      if (refreshIntervalSec < 300) {
        warnings.push(`Camera ${camera.name}: refresh interval too low, clamped to 300s`);
      }

      return {
        ...camera,
        enabled: camera.enabled ?? true,
        frameIntervalSec,
        refreshIntervalSec,
        maxCacheItems: Math.max(10, camera.maxCacheItems ?? 100),
        maxDiskMb: Math.max(50, camera.maxDiskMb ?? 500),
        shuffle: camera.shuffle ?? false,
        retainLastGood: camera.retainLastGood ?? true,
        preferLandscape: camera.preferLandscape ?? true,
      };
    }) ?? [];

  return { value: normalized, warnings };
}
