import { PlatformConfig } from './types';
export interface ValidationResult<T> {
    value: T;
    warnings: string[];
}
export declare function validateConfig(config: PlatformConfig): ValidationResult<PlatformConfig>;
