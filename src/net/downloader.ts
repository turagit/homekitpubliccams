import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB safety limit

const ALLOWED_MIME_PREFIXES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
];

export interface DownloadResult {
  success: boolean;
  localPath: string;
  byteSize: number;
  mimeType?: string;
  error?: string;
}

export class Downloader {
  /**
   * Downloads a URL to a target path atomically:
   * 1. Download to a temp file in the same directory
   * 2. Verify MIME type from content-type header
   * 3. Rename atomically into place
   */
  public async download(url: string, targetPath: string): Promise<DownloadResult> {
    const dir = path.dirname(targetPath);
    await fs.promises.mkdir(dir, { recursive: true });

    const tmpName = `.download-${crypto.randomBytes(8).toString('hex')}${path.extname(targetPath) || '.tmp'}`;
    const tmpPath = path.join(dir, tmpName);

    try {
      const result = await this.downloadToFile(url, tmpPath);

      if (!result.success) {
        await safeUnlink(tmpPath);
        return result;
      }

      // Verify the file was actually written and has content
      const stat = await fs.promises.stat(tmpPath);
      if (stat.size === 0) {
        await safeUnlink(tmpPath);
        return { success: false, localPath: targetPath, byteSize: 0, error: 'Downloaded file is empty' };
      }

      // Atomic rename
      await fs.promises.rename(tmpPath, targetPath);

      return {
        success: true,
        localPath: targetPath,
        byteSize: stat.size,
        mimeType: result.mimeType,
      };
    } catch (err) {
      await safeUnlink(tmpPath);
      return {
        success: false,
        localPath: targetPath,
        byteSize: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private downloadToFile(url: string, filePath: string): Promise<DownloadResult> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(parsed, {
        method: 'GET',
        headers: {
          'User-Agent': 'homebridge-public-spacecam/1.0',
          Accept: 'image/*',
        },
        timeout: DEFAULT_TIMEOUT_MS,
      }, (res) => {
        // Follow redirects (up to 5)
        if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          this.downloadToFile(res.headers.location, filePath).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          resolve({
            success: false,
            localPath: filePath,
            byteSize: 0,
            error: `HTTP ${res.statusCode} downloading ${url}`,
          });
          return;
        }

        const contentType = res.headers['content-type'] || '';
        const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix));
        if (contentType && !isAllowed) {
          res.resume();
          resolve({
            success: false,
            localPath: filePath,
            byteSize: 0,
            mimeType: contentType,
            error: `Unsupported content type: ${contentType}`,
          });
          return;
        }

        let totalBytes = 0;
        const fileStream = fs.createWriteStream(filePath);

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_FILE_SIZE) {
            res.destroy();
            fileStream.destroy();
            resolve({
              success: false,
              localPath: filePath,
              byteSize: totalBytes,
              error: `File exceeds ${MAX_FILE_SIZE} bytes limit`,
            });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          resolve({
            success: true,
            localPath: filePath,
            byteSize: totalBytes,
            mimeType: contentType || undefined,
          });
        });

        fileStream.on('error', (err) => {
          reject(err);
        });

        res.on('error', (err) => {
          fileStream.destroy();
          reject(err);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Download timed out: ${url}`));
      });
      req.on('error', reject);
      req.end();
    });
  }
}

async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore
  }
}
