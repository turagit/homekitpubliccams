export class Downloader {
  public async download(_url: string, _targetPath: string): Promise<void> {
    throw new Error('Downloader.download is not implemented in foundation build.');
  }
}
