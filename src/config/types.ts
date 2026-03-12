export type SourceProvider = 'nasa-api' | 'nasa-library' | 'curated-feed';

export type SourcePresetId =
  | 'curiosity-latest'
  | 'perseverance-latest'
  | 'jwst-featured'
  | 'hubble-featured'
  | 'apod'
  | 'nasa-mixed';

export interface CameraSourceConfig {
  /**
   * The source backend used to fetch and normalize media.
   */
  provider: SourceProvider;
  /**
   * Provider-specific preset that chooses the concrete data feed.
   */
  presetId: SourcePresetId;
}
