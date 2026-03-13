import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CacheManager } from '../src/cache/cache-manager';
import { CachedAsset } from '../src/cache/cache-index';

describe('CacheManager', () => {
  let tmpDir: string;
  let manager: CacheManager;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cache-'));
    manager = new CacheManager(tmpDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('loadIndex returns empty index when no file exists', async () => {
    const index = await manager.loadIndex('test-source');
    expect(index.sourceId).toBe('test-source');
    expect(index.assets).toHaveLength(0);
  });

  it('addAsset persists to disk and can be reloaded', async () => {
    await manager.ensureDirs('test-source');

    // Create a fake image file
    const assetPath = path.join(manager.assetsDir('test-source'), 'img1.jpg');
    await fs.promises.writeFile(assetPath, Buffer.alloc(1024));

    const asset: CachedAsset = {
      assetId: 'img1',
      sourceId: 'test-source',
      localPath: assetPath,
      downloadedAt: new Date().toISOString(),
      byteSize: 1024,
      isValid: true,
    };

    await manager.addAsset('test-source', asset, 100, 500);

    expect(manager.getAssets('test-source')).toHaveLength(1);
    expect(manager.hasAsset('test-source', 'img1')).toBe(true);
    expect(manager.hasAsset('test-source', 'nonexistent')).toBe(false);

    // Verify index file was written
    const indexPath = path.join(tmpDir, 'sources', 'test-source', 'index.json');
    const raw = await fs.promises.readFile(indexPath, 'utf-8');
    const savedIndex = JSON.parse(raw);
    expect(savedIndex.assets).toHaveLength(1);
    expect(savedIndex.assets[0].assetId).toBe('img1');
  });

  it('evicts oldest assets when over maxItems', async () => {
    await manager.ensureDirs('evict');

    for (let i = 0; i < 5; i++) {
      const assetPath = path.join(manager.assetsDir('evict'), `img${i}.jpg`);
      await fs.promises.writeFile(assetPath, Buffer.alloc(100));

      await manager.addAsset('evict', {
        assetId: `img${i}`,
        sourceId: 'evict',
        localPath: assetPath,
        downloadedAt: new Date(Date.now() + i * 1000).toISOString(),
        byteSize: 100,
        isValid: true,
      }, 3, 500); // maxItems = 3
    }

    const assets = manager.getAssets('evict');
    expect(assets.length).toBeLessThanOrEqual(3);
  });

  it('deduplicates assets by ID', async () => {
    await manager.ensureDirs('dedup');
    const assetPath = path.join(manager.assetsDir('dedup'), 'img.jpg');
    await fs.promises.writeFile(assetPath, Buffer.alloc(100));

    const base: CachedAsset = {
      assetId: 'same-id',
      sourceId: 'dedup',
      localPath: assetPath,
      downloadedAt: new Date().toISOString(),
      byteSize: 100,
      isValid: true,
    };

    await manager.addAsset('dedup', { ...base }, 100, 500);
    await manager.addAsset('dedup', { ...base, downloadedAt: new Date(Date.now() + 1000).toISOString() }, 100, 500);

    expect(manager.getAssets('dedup')).toHaveLength(1);
  });

  it('cleanupTempFiles removes .download- prefixed files', async () => {
    await manager.ensureDirs('cleanup');
    const tmpFile = path.join(manager.assetsDir('cleanup'), '.download-abc123.tmp');
    const realFile = path.join(manager.assetsDir('cleanup'), 'real-image.jpg');
    await fs.promises.writeFile(tmpFile, 'temp');
    await fs.promises.writeFile(realFile, 'real');

    await manager.cleanupTempFiles('cleanup');

    const files = await fs.promises.readdir(manager.assetsDir('cleanup'));
    expect(files).not.toContain('.download-abc123.tmp');
    expect(files).toContain('real-image.jpg');
  });

  it('loadIndex filters out missing files', async () => {
    await manager.ensureDirs('missing');

    // Create asset and persist
    const assetPath = path.join(manager.assetsDir('missing'), 'exists.jpg');
    await fs.promises.writeFile(assetPath, Buffer.alloc(100));

    await manager.addAsset('missing', {
      assetId: 'exists',
      sourceId: 'missing',
      localPath: assetPath,
      downloadedAt: new Date().toISOString(),
      byteSize: 100,
      isValid: true,
    }, 100, 500);

    // Also add a reference to a file that doesn't exist
    await manager.addAsset('missing', {
      assetId: 'ghost',
      sourceId: 'missing',
      localPath: path.join(manager.assetsDir('missing'), 'ghost.jpg'),
      downloadedAt: new Date().toISOString(),
      byteSize: 100,
      isValid: true,
    }, 100, 500);

    // Reload from disk — ghost should be filtered out
    const newManager = new CacheManager(tmpDir);
    const index = await newManager.loadIndex('missing');
    expect(index.assets.every((a) => a.assetId !== 'ghost' || fs.existsSync(a.localPath))).toBe(true);
  });
});
