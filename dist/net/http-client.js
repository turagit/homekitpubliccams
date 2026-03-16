"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const node_https_1 = __importDefault(require("node:https"));
const node_http_1 = __importDefault(require("node:http"));
const node_url_1 = require("node:url");
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;
class HttpClient {
    backoffUntil = new Map();
    async fetchJson(url, options = {}) {
        const host = new node_url_1.URL(url).host;
        const backoffEnd = this.backoffUntil.get(host);
        if (backoffEnd && Date.now() < backoffEnd) {
            throw new Error(`Rate-limited: backing off ${host} until ${new Date(backoffEnd).toISOString()}`);
        }
        let lastError;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const raw = await this.rawRequest(url, options);
                if (raw.status === 304) {
                    return { status: 304, data: {}, headers: raw.headers, notModified: true };
                }
                if (raw.status === 429) {
                    const retryAfter = parseInt(raw.headers['retry-after'] || '60', 10);
                    this.backoffUntil.set(host, Date.now() + retryAfter * 1000);
                    throw new Error(`Rate limited by ${host}, retry after ${retryAfter}s`);
                }
                if (raw.status >= 500) {
                    throw new Error(`Server error ${raw.status} from ${url}`);
                }
                if (raw.status >= 400) {
                    throw new Error(`HTTP ${raw.status} from ${url}`);
                }
                const data = JSON.parse(raw.body);
                return { status: raw.status, data, headers: raw.headers, notModified: false };
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < MAX_RETRIES - 1) {
                    await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
                }
            }
        }
        throw lastError ?? new Error(`Failed to fetch ${url}`);
    }
    async fetchBuffer(url, options = {}) {
        const host = new node_url_1.URL(url).host;
        const backoffEnd = this.backoffUntil.get(host);
        if (backoffEnd && Date.now() < backoffEnd) {
            throw new Error(`Rate-limited: backing off ${host} until ${new Date(backoffEnd).toISOString()}`);
        }
        let lastError;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const raw = await this.rawRequest(url, options);
                if (raw.status === 429) {
                    const retryAfter = parseInt(raw.headers['retry-after'] || '60', 10);
                    this.backoffUntil.set(host, Date.now() + retryAfter * 1000);
                    throw new Error(`Rate limited by ${host}, retry after ${retryAfter}s`);
                }
                if (raw.status >= 400) {
                    throw new Error(`HTTP ${raw.status} from ${url}`);
                }
                return { status: raw.status, data: raw.rawBuffer, headers: raw.headers };
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < MAX_RETRIES - 1) {
                    await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
                }
            }
        }
        throw lastError ?? new Error(`Failed to fetch ${url}`);
    }
    rawRequest(url, options) {
        return new Promise((resolve, reject) => {
            const parsed = new node_url_1.URL(url);
            const client = parsed.protocol === 'https:' ? node_https_1.default : node_http_1.default;
            const headers = {
                'User-Agent': 'homebridge-public-spacecam/1.0',
                Accept: 'application/json',
                ...(options.headers ?? {}),
            };
            if (options.etag) {
                headers['If-None-Match'] = options.etag;
            }
            if (options.lastModified) {
                headers['If-Modified-Since'] = options.lastModified;
            }
            const req = client.request(parsed, {
                method: options.method ?? 'GET',
                headers,
                timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            }, (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const responseHeaders = {};
                    for (const [key, value] of Object.entries(res.headers)) {
                        if (typeof value === 'string') {
                            responseHeaders[key] = value;
                        }
                        else if (Array.isArray(value)) {
                            responseHeaders[key] = value[0];
                        }
                    }
                    const rawBuffer = Buffer.concat(chunks);
                    resolve({
                        status: res.statusCode ?? 0,
                        body: rawBuffer.toString('utf-8'),
                        rawBuffer,
                        headers: responseHeaders,
                    });
                });
                res.on('error', reject);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timed out: ${url}`));
            });
            req.on('error', reject);
            req.end();
        });
    }
}
exports.HttpClient = HttpClient;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
