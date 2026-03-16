import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

export interface HttpRequestOptions {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
  headers?: Record<string, string>;
  etag?: string;
  lastModified?: string;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
  notModified: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;

export class HttpClient {
  private backoffUntil = new Map<string, number>();

  public async fetchJson<T>(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const host = new URL(url).host;
    const backoffEnd = this.backoffUntil.get(host);
    if (backoffEnd && Date.now() < backoffEnd) {
      throw new Error(`Rate-limited: backing off ${host} until ${new Date(backoffEnd).toISOString()}`);
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await this.rawRequest(url, options);
        if (raw.status === 304) {
          return { status: 304, data: {} as T, headers: raw.headers, notModified: true };
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
        const data = JSON.parse(raw.body) as T;
        return { status: raw.status, data, headers: raw.headers, notModified: false };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        }
      }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  public async fetchBuffer(url: string, options: HttpRequestOptions = {}): Promise<{ status: number; data: Buffer; headers: Record<string, string> }> {
    const host = new URL(url).host;
    const backoffEnd = this.backoffUntil.get(host);
    if (backoffEnd && Date.now() < backoffEnd) {
      throw new Error(`Rate-limited: backing off ${host} until ${new Date(backoffEnd).toISOString()}`);
    }

    let lastError: Error | undefined;
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
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        }
      }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  private rawRequest(url: string, options: HttpRequestOptions): Promise<{ status: number; body: string; rawBuffer: Buffer; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const headers: Record<string, string> = {
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
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const responseHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') {
              responseHeaders[key] = value;
            } else if (Array.isArray(value)) {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
