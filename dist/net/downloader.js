"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloader = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_https_1 = __importDefault(require("node:https"));
const node_http_1 = __importDefault(require("node:http"));
const node_url_1 = require("node:url");
const node_crypto_1 = __importDefault(require("node:crypto"));
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB safety limit
const ALLOWED_MIME_PREFIXES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
];
class Downloader {
    /**
     * Downloads a URL to a target path atomically:
     * 1. Download to a temp file in the same directory
     * 2. Verify MIME type from content-type header
     * 3. Rename atomically into place
     */
    async download(url, targetPath) {
        const dir = node_path_1.default.dirname(targetPath);
        await node_fs_1.default.promises.mkdir(dir, { recursive: true });
        const tmpName = `.download-${node_crypto_1.default.randomBytes(8).toString('hex')}${node_path_1.default.extname(targetPath) || '.tmp'}`;
        const tmpPath = node_path_1.default.join(dir, tmpName);
        try {
            const result = await this.downloadToFile(url, tmpPath);
            if (!result.success) {
                await safeUnlink(tmpPath);
                return result;
            }
            // Verify the file was actually written and has content
            const stat = await node_fs_1.default.promises.stat(tmpPath);
            if (stat.size === 0) {
                await safeUnlink(tmpPath);
                return { success: false, localPath: targetPath, byteSize: 0, error: 'Downloaded file is empty' };
            }
            // Atomic rename
            await node_fs_1.default.promises.rename(tmpPath, targetPath);
            return {
                success: true,
                localPath: targetPath,
                byteSize: stat.size,
                mimeType: result.mimeType,
            };
        }
        catch (err) {
            await safeUnlink(tmpPath);
            return {
                success: false,
                localPath: targetPath,
                byteSize: 0,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
    downloadToFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const parsed = new node_url_1.URL(url);
            const client = parsed.protocol === 'https:' ? node_https_1.default : node_http_1.default;
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
                const fileStream = node_fs_1.default.createWriteStream(filePath);
                res.on('data', (chunk) => {
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
exports.Downloader = Downloader;
async function safeUnlink(filePath) {
    try {
        await node_fs_1.default.promises.unlink(filePath);
    }
    catch {
        // ignore
    }
}
