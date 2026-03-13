import { evictOldest, removeInvalidAssets, sortByNewest } from '../src/cache/eviction-policy';
import { CachedAsset } from '../src/cache/cache-index';

function makeAsset(id: string, downloadedAt: string, isValid = true): CachedAsset {
  return {
    assetId: id,
    sourceId: 'test',
    localPath: `/tmp/${id}.jpg`,
    downloadedAt,
    byteSize: 1000,
    isValid,
  };
}

describe('eviction-policy', () => {
  describe('removeInvalidAssets', () => {
    it('filters out invalid assets', () => {
      const assets = [
        makeAsset('a', '2024-01-01', true),
        makeAsset('b', '2024-01-02', false),
        makeAsset('c', '2024-01-03', true),
      ];
      const result = removeInvalidAssets(assets);
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.assetId)).toEqual(['a', 'c']);
    });
  });

  describe('sortByNewest', () => {
    it('sorts by downloadedAt descending', () => {
      const assets = [
        makeAsset('old', '2024-01-01'),
        makeAsset('new', '2024-01-03'),
        makeAsset('mid', '2024-01-02'),
      ];
      const result = sortByNewest(assets);
      expect(result.map((a) => a.assetId)).toEqual(['new', 'mid', 'old']);
    });
  });

  describe('evictOldest', () => {
    it('keeps only newest N items', () => {
      const assets = [
        makeAsset('a', '2024-01-01'),
        makeAsset('b', '2024-01-02'),
        makeAsset('c', '2024-01-03'),
        makeAsset('d', '2024-01-04'),
      ];
      const result = evictOldest(assets, 2);
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.assetId)).toEqual(['d', 'c']);
    });

    it('returns empty for maxItems 0', () => {
      const assets = [makeAsset('a', '2024-01-01')];
      expect(evictOldest(assets, 0)).toEqual([]);
    });

    it('returns all when under limit', () => {
      const assets = [makeAsset('a', '2024-01-01'), makeAsset('b', '2024-01-02')];
      const result = evictOldest(assets, 10);
      expect(result).toHaveLength(2);
    });
  });
});
