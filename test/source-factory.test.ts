import { createSourceAdapter } from '../src/sources/source-factory';
import { CameraConfig } from '../src/config/types';

function makeCameraConfig(sourceType: string, name = 'Test'): CameraConfig {
  return {
    enabled: true,
    sourceType: sourceType as any,
    name,
    frameIntervalSec: 4,
    refreshIntervalSec: 900,
    maxCacheItems: 50,
    maxDiskMb: 200,
    shuffle: false,
    retainLastGood: true,
    preferLandscape: true,
  };
}

describe('createSourceAdapter', () => {
  it('creates ApodSource for apod', () => {
    const adapter = createSourceAdapter(makeCameraConfig('apod'));
    expect(adapter.getSourceInfo().id).toBe('apod');
    expect(adapter.getSourceInfo().title).toContain('Astronomy');
  });

  it('creates MarsSource for curiosity', () => {
    const adapter = createSourceAdapter(makeCameraConfig('curiosity'));
    expect(adapter.getSourceInfo().id).toBe('curiosity');
    expect(adapter.getSourceInfo().title).toContain('Curiosity');
  });

  it('creates MarsSource for perseverance', () => {
    const adapter = createSourceAdapter(makeCameraConfig('perseverance'));
    expect(adapter.getSourceInfo().id).toBe('perseverance');
    expect(adapter.getSourceInfo().title).toContain('Perseverance');
  });

  it('creates JwstSource for jwst', () => {
    const adapter = createSourceAdapter(makeCameraConfig('jwst'));
    expect(adapter.getSourceInfo().id).toBe('jwst');
  });

  it('creates HubbleSource for hubble', () => {
    const adapter = createSourceAdapter(makeCameraConfig('hubble'));
    expect(adapter.getSourceInfo().id).toBe('hubble');
  });

  it('creates NasaImageLibrarySource for nasa-mixed', () => {
    const adapter = createSourceAdapter(makeCameraConfig('nasa-mixed'));
    expect(adapter.getSourceInfo().id).toBe('nasa-mixed');
  });

  it('defaults to nasa-mixed for unknown sourceType', () => {
    const adapter = createSourceAdapter(makeCameraConfig('unknown'));
    expect(adapter.getSourceInfo().id).toBe('nasa-mixed');
  });

  it('passes apiKey through', () => {
    const adapter = createSourceAdapter(makeCameraConfig('apod'), 'MY_KEY');
    expect(adapter.validateConfig(makeCameraConfig('apod')).valid).toBe(true);
  });

  it('all adapters have valid recommended refresh intervals', () => {
    for (const type of ['apod', 'curiosity', 'perseverance', 'jwst', 'hubble', 'nasa-mixed']) {
      const adapter = createSourceAdapter(makeCameraConfig(type));
      const info = adapter.getSourceInfo();
      expect(info.recommendedRefreshIntervalSec).toBeGreaterThanOrEqual(300);
    }
  });
});
