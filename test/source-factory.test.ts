import { createSourceAdapter } from '../src/sources/source-factory';
import { CameraConfig } from '../src/config/types';

function makeCameraConfig(sourceType: string, name = 'Test'): CameraConfig {
  return {
    enabled: true,
    sourceType: sourceType as any,
    name,
    frameIntervalSec: 4,
    refreshIntervalSec: 14400,
    maxCacheItems: 50,
    maxDiskMb: 200,
    shuffle: false,
    retainLastGood: true,
    preferLandscape: true,
  };
}

describe('createSourceAdapter', () => {
  it('creates MslRawSource for msl-front', () => {
    const adapter = createSourceAdapter(makeCameraConfig('msl-front'));
    expect(adapter.getSourceInfo().id).toBe('msl-front');
    expect(adapter.getSourceInfo().title).toContain('Front');
  });

  it('creates MslRawSource for msl-rear', () => {
    const adapter = createSourceAdapter(makeCameraConfig('msl-rear'));
    expect(adapter.getSourceInfo().id).toBe('msl-rear');
    expect(adapter.getSourceInfo().title).toContain('Rear');
  });

  it('creates MslRawSource for msl-left', () => {
    const adapter = createSourceAdapter(makeCameraConfig('msl-left'));
    expect(adapter.getSourceInfo().id).toBe('msl-left');
    expect(adapter.getSourceInfo().title).toContain('Left');
  });

  it('creates MslRawSource for msl-right', () => {
    const adapter = createSourceAdapter(makeCameraConfig('msl-right'));
    expect(adapter.getSourceInfo().id).toBe('msl-right');
    expect(adapter.getSourceInfo().title).toContain('Right');
  });

  it('throws for unknown sourceType', () => {
    expect(() => createSourceAdapter(makeCameraConfig('unknown'))).toThrow();
  });

  it('creates M20RawSource for m20-front-left', () => {
    const adapter = createSourceAdapter(makeCameraConfig('m20-front-left'));
    expect(adapter.getSourceInfo().id).toBe('m20-front-left');
    expect(adapter.getSourceInfo().title).toContain('Perseverance');
  });

  it('creates M20RawSource for m20-front-right', () => {
    const adapter = createSourceAdapter(makeCameraConfig('m20-front-right'));
    expect(adapter.getSourceInfo().id).toBe('m20-front-right');
    expect(adapter.getSourceInfo().title).toContain('Perseverance');
  });

  it('all adapters have recommended refresh of 14400s', () => {
    for (const type of ['msl-front', 'msl-rear', 'msl-left', 'msl-right', 'm20-front-left', 'm20-front-right']) {
      const adapter = createSourceAdapter(makeCameraConfig(type));
      const info = adapter.getSourceInfo();
      expect(info.recommendedRefreshIntervalSec).toBe(14400);
    }
  });
});
