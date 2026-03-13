export interface DownloadResult {
    success: boolean;
    localPath: string;
    byteSize: number;
    mimeType?: string;
    error?: string;
}
export declare class Downloader {
    /**
     * Downloads a URL to a target path atomically:
     * 1. Download to a temp file in the same directory
     * 2. Verify MIME type from content-type header
     * 3. Rename atomically into place
     */
    download(url: string, targetPath: string): Promise<DownloadResult>;
    private downloadToFile;
}
