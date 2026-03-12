import type { CameraSourceConfig, SourcePresetId, SourceProvider } from '../config/types';

export interface SourceAdapter {
  readonly provider: SourceProvider;
  readonly presetId: SourcePresetId;
}

export class NasaApiAdapter implements SourceAdapter {
  constructor(public readonly presetId: SourcePresetId) {}

  readonly provider: SourceProvider = 'nasa-api';
}

export class NasaLibraryAdapter implements SourceAdapter {
  constructor(public readonly presetId: SourcePresetId) {}

  readonly provider: SourceProvider = 'nasa-library';
}

export class CuratedFeedAdapter implements SourceAdapter {
  constructor(public readonly presetId: SourcePresetId) {}

  readonly provider: SourceProvider = 'curated-feed';
}

const providerPresets: Record<SourceProvider, readonly SourcePresetId[]> = {
  'nasa-api': ['curiosity-latest', 'perseverance-latest', 'apod'],
  'nasa-library': ['jwst-featured', 'hubble-featured'],
  'curated-feed': ['nasa-mixed'],
};

export function isPresetSupportedByProvider(
  provider: SourceProvider,
  presetId: SourcePresetId,
): boolean {
  return providerPresets[provider].includes(presetId);
}

export function createSourceAdapter(config: CameraSourceConfig): SourceAdapter {
  const { provider, presetId } = config;

  if (!isPresetSupportedByProvider(provider, presetId)) {
    throw new Error(`Unsupported preset \"${presetId}\" for provider \"${provider}\".`);
  }

  switch (provider) {
    case 'nasa-api':
      return new NasaApiAdapter(presetId);
    case 'nasa-library':
      return new NasaLibraryAdapter(presetId);
    case 'curated-feed':
      return new CuratedFeedAdapter(presetId);
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unsupported provider: ${exhaustiveCheck}`);
    }
  }
}
