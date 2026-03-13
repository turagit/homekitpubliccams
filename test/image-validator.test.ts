import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ImageValidator } from '../src/image/image-validator';

describe('ImageValidator', () => {
  const validator = new ImageValidator();
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'imgval-'));
  });

  afterAll(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('validates JPEG files', async () => {
    // JPEG magic bytes + enough padding to meet min size
    const buf = Buffer.alloc(2048);
    buf[0] = 0xFF;
    buf[1] = 0xD8;
    buf[2] = 0xFF;
    const filePath = path.join(tmpDir, 'test.jpg');
    await fs.promises.writeFile(filePath, buf);

    const info = await validator.validate(filePath);
    expect(info.valid).toBe(true);
    expect(info.mimeType).toBe('image/jpeg');
  });

  it('validates PNG files', async () => {
    const buf = Buffer.alloc(2048);
    const pngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    pngMagic.forEach((b, i) => buf[i] = b);
    const filePath = path.join(tmpDir, 'test.png');
    await fs.promises.writeFile(filePath, buf);

    const info = await validator.validate(filePath);
    expect(info.valid).toBe(true);
    expect(info.mimeType).toBe('image/png');
  });

  it('rejects files that are too small', async () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF]); // valid JPEG magic but only 3 bytes
    const filePath = path.join(tmpDir, 'tiny.jpg');
    await fs.promises.writeFile(filePath, buf);

    const info = await validator.validate(filePath);
    expect(info.valid).toBe(false);
  });

  it('rejects non-image files', async () => {
    const buf = Buffer.alloc(2048, 0x00); // all zeros — no known magic
    const filePath = path.join(tmpDir, 'notimage.bin');
    await fs.promises.writeFile(filePath, buf);

    const info = await validator.validate(filePath);
    expect(info.valid).toBe(false);
  });

  it('rejects non-existent files', async () => {
    const info = await validator.validate('/nonexistent/file.jpg');
    expect(info.valid).toBe(false);
    expect(info.fileSize).toBe(0);
  });

  it('isValidImage returns boolean', async () => {
    const buf = Buffer.alloc(2048);
    buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF;
    const filePath = path.join(tmpDir, 'bool.jpg');
    await fs.promises.writeFile(filePath, buf);

    expect(await validator.isValidImage(filePath)).toBe(true);
    expect(await validator.isValidImage('/nonexistent')).toBe(false);
  });
});
