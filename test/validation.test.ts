import { validateConfig } from '../src/config/validation';
import { PlatformConfig } from '../src/config/types';

describe('validateConfig', () => {
  const baseConfig: PlatformConfig = {
    platform: 'PublicSpaceCamPlatform',
    name: 'Test',
  };

  it('applies defaults when fields are missing', () => {
    const { value, warnings } = validateConfig(baseConfig);
    expect(value.enabled).toBe(true);
    expect(value.logLevel).toBe('info');
    expect(value.defaultFrameIntervalSec).toBe(4);
    expect(value.defaultRefreshIntervalSec).toBe(900);
    expect(value.cameras).toEqual([]);
    expect(warnings).toHaveLength(0);
  });

  it('clamps refresh interval below minimum', () => {
    const config: PlatformConfig = {
      ...baseConfig,
      cameras: [{
        enabled: true,
        sourceType: 'msl-front',
        name: 'Front',
        frameIntervalSec: 4,
        refreshIntervalSec: 10, // way below 300 minimum
        maxCacheItems: 50,
        maxDiskMb: 200,
        shuffle: false,
        retainLastGood: true,
        preferLandscape: true,
      }],
    };
    const { value, warnings } = validateConfig(config);
    expect(value.cameras![0].refreshIntervalSec).toBe(300);
    expect(warnings.some((w) => w.includes('clamped'))).toBe(true);
  });

  it('skips cameras with missing name', () => {
    const config: PlatformConfig = {
      ...baseConfig,
      cameras: [{
        enabled: true,
        sourceType: 'msl-front',
        name: '',
        frameIntervalSec: 4,
        refreshIntervalSec: 14400,
        maxCacheItems: 50,
        maxDiskMb: 200,
        shuffle: false,
        retainLastGood: true,
        preferLandscape: true,
      }],
    };
    const { value, warnings } = validateConfig(config);
    expect(value.cameras).toHaveLength(0);
    expect(warnings.some((w) => w.includes('Skipping invalid'))).toBe(true);
  });

  it('skips cameras with invalid sourceType', () => {
    const config: PlatformConfig = {
      ...baseConfig,
      cameras: [{
        enabled: true,
        sourceType: 'invalid' as any,
        name: 'Bad Source',
        frameIntervalSec: 4,
        refreshIntervalSec: 14400,
        maxCacheItems: 50,
        maxDiskMb: 200,
        shuffle: false,
        retainLastGood: true,
        preferLandscape: true,
      }],
    };
    const { value, warnings } = validateConfig(config);
    expect(value.cameras).toHaveLength(0);
    expect(warnings.some((w) => w.includes('Skipping invalid'))).toBe(true);
  });

  it('warns on duplicate camera entries', () => {
    const cam = {
      enabled: true,
      sourceType: 'msl-front' as const,
      name: 'Front',
      frameIntervalSec: 4,
      refreshIntervalSec: 14400,
      maxCacheItems: 50,
      maxDiskMb: 200,
      shuffle: false,
      retainLastGood: true,
      preferLandscape: true,
    };
    const config: PlatformConfig = {
      ...baseConfig,
      cameras: [cam, { ...cam }],
    };
    const { warnings } = validateConfig(config);
    expect(warnings.some((w) => w.includes('Duplicate'))).toBe(true);
  });

  it('trims camera names', () => {
    const config: PlatformConfig = {
      ...baseConfig,
      cameras: [{
        enabled: true,
        sourceType: 'msl-front',
        name: '  Front  ',
        frameIntervalSec: 4,
        refreshIntervalSec: 14400,
        maxCacheItems: 50,
        maxDiskMb: 200,
        shuffle: false,
        retainLastGood: true,
        preferLandscape: true,
      }],
    };
    const { value } = validateConfig(config);
    expect(value.cameras![0].name).toBe('Front');
  });
});
