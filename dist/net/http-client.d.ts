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
export declare class HttpClient {
    private backoffUntil;
    fetchJson<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    fetchBuffer(url: string, options?: HttpRequestOptions): Promise<{
        status: number;
        data: Buffer;
        headers: Record<string, string>;
    }>;
    private rawRequest;
}
