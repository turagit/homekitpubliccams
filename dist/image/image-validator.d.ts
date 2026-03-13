export interface ImageInfo {
    valid: boolean;
    mimeType?: string;
    fileSize: number;
}
export declare class ImageValidator {
    /**
     * Validates an image file by checking:
     * 1. File exists and is readable
     * 2. File is larger than MIN_IMAGE_SIZE
     * 3. Magic bytes match a known image format
     */
    validate(filePath: string): Promise<ImageInfo>;
    /** Simple boolean check for backward compat */
    isValidImage(filePath: string): Promise<boolean>;
}
