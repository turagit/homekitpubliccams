"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
const SOURCE_TYPES = [
    'msl-front', 'msl-rear', 'msl-left', 'msl-right',
    'm20-front-left', 'm20-front-right',
];
const MIN_FRAME_INTERVAL_SEC = 1;
const MIN_REFRESH_INTERVAL_SEC = 300;
const MIN_CACHE_ITEMS = 10;
const MIN_DISK_MB = 50;
const clampInt = (value, floor, fallback) => {
    const parsed = Number.isFinite(value) ? Math.floor(value) : fallback;
    return Math.max(floor, parsed);
};
const withDefaults = (config) => ({
    ...config,
    enabled: config.enabled ?? true,
    logLevel: config.logLevel ?? 'info',
    defaultFrameIntervalSec: clampInt(config.defaultFrameIntervalSec, MIN_FRAME_INTERVAL_SEC, 4),
    defaultRefreshIntervalSec: clampInt(config.defaultRefreshIntervalSec, MIN_REFRESH_INTERVAL_SEC, 900),
    maxConcurrentDownloads: clampInt(config.maxConcurrentDownloads, 1, 2),
    globalDiskLimitMb: clampInt(config.globalDiskLimitMb, MIN_DISK_MB, 1024),
    cameras: config.cameras ?? [],
});
function validateConfig(config) {
    const normalized = withDefaults(config);
    const warnings = [];
    const uniqueCameraKeys = new Set();
    normalized.cameras = normalized.cameras
        ?.filter((camera) => {
        const sourceTypeIsValid = SOURCE_TYPES.includes(camera?.sourceType);
        const normalizedName = camera?.name?.trim();
        if (!normalizedName || !sourceTypeIsValid) {
            warnings.push(`Skipping invalid camera entry: ${JSON.stringify(camera)}`);
            return false;
        }
        return true;
    })
        .map((camera) => {
        const trimmedName = camera.name.trim();
        const requestedRefresh = camera.refreshIntervalSec ?? normalized.defaultRefreshIntervalSec ?? 900;
        const frameIntervalSec = clampInt(camera.frameIntervalSec, MIN_FRAME_INTERVAL_SEC, normalized.defaultFrameIntervalSec ?? 4);
        const refreshIntervalSec = clampInt(requestedRefresh, MIN_REFRESH_INTERVAL_SEC, normalized.defaultRefreshIntervalSec ?? 900);
        if (requestedRefresh < MIN_REFRESH_INTERVAL_SEC) {
            warnings.push(`Camera ${trimmedName}: refresh interval below ${MIN_REFRESH_INTERVAL_SEC}s was clamped.`);
        }
        const uniqueKey = `${camera.sourceType}:${trimmedName}`;
        if (uniqueCameraKeys.has(uniqueKey)) {
            warnings.push(`Duplicate camera entry detected for ${uniqueKey}; Homebridge UUID collision may occur.`);
        }
        uniqueCameraKeys.add(uniqueKey);
        return {
            ...camera,
            name: trimmedName,
            enabled: camera.enabled ?? true,
            frameIntervalSec,
            refreshIntervalSec,
            maxCacheItems: clampInt(camera.maxCacheItems, MIN_CACHE_ITEMS, 100),
            maxDiskMb: clampInt(camera.maxDiskMb, MIN_DISK_MB, 500),
            shuffle: camera.shuffle ?? false,
            retainLastGood: camera.retainLastGood ?? true,
            preferLandscape: camera.preferLandscape ?? true,
        };
    }) ?? [];
    return { value: normalized, warnings };
}
