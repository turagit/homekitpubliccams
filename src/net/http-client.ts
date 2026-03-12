export interface HttpRequestOptions {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
}

export class HttpClient {
  public async fetchJson<T>(_url: string, _options: HttpRequestOptions = {}): Promise<T> {
    throw new Error('HttpClient.fetchJson is not implemented in foundation build.');
  }
}
