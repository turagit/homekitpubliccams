import fs from 'node:fs';

// Magic bytes for supported image formats
const SIGNATURES: Array<{ magic: Buffer; type: string }> = [
  { magic: Buffer.from([0xFF, 0xD8, 0xFF]), type: 'image/jpeg' },
  { magic: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), type: 'image/png' },
  { magic: Buffer.from([0x47, 0x49, 0x46, 0x38]), type: 'image/gif' },
  { magic: Buffer.from([0x52, 0x49, 0x46, 0x46]), type: 'image/webp' }, // RIFF header (WebP)
];

const MIN_IMAGE_SIZE = 1024; // 1 KB minimum — anything smaller is likely corrupt

export interface ImageInfo {
  valid: boolean;
  mimeType?: string;
  fileSize: number;
}

export class ImageValidator {
  /**
   * Validates an image file by checking:
   * 1. File exists and is readable
   * 2. File is larger than MIN_IMAGE_SIZE
   * 3. Magic bytes match a known image format
   */
  public async validate(filePath: string): Promise<ImageInfo> {
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.size < MIN_IMAGE_SIZE) {
        return { valid: false, fileSize: stat.size };
      }

      const fd = await fs.promises.open(filePath, 'r');
      try {
        const headerBuf = Buffer.alloc(16);
        await fd.read(headerBuf, 0, 16, 0);

        for (const sig of SIGNATURES) {
          if (headerBuf.subarray(0, sig.magic.length).equals(sig.magic)) {
            return { valid: true, mimeType: sig.type, fileSize: stat.size };
          }
        }

        // TIFF: little-endian (II) or big-endian (MM)
        const tiffLE = headerBuf[0] === 0x49 && headerBuf[1] === 0x49 && headerBuf[2] === 0x2A && headerBuf[3] === 0x00;
        const tiffBE = headerBuf[0] === 0x4D && headerBuf[1] === 0x4D && headerBuf[2] === 0x00 && headerBuf[3] === 0x2A;
        if (tiffLE || tiffBE) {
          return { valid: true, mimeType: 'image/tiff', fileSize: stat.size };
        }

        return { valid: false, fileSize: stat.size };
      } finally {
        await fd.close();
      }
    } catch {
      return { valid: false, fileSize: 0 };
    }
  }

  /** Simple boolean check for backward compat */
  public async isValidImage(filePath: string): Promise<boolean> {
    const info = await this.validate(filePath);
    return info.valid;
  }
}
