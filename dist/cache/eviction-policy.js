"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeInvalidAssets = removeInvalidAssets;
exports.sortByNewest = sortByNewest;
exports.evictOldest = evictOldest;
function removeInvalidAssets(assets) {
    return assets.filter((asset) => asset.isValid);
}
function sortByNewest(assets) {
    return [...assets].sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
}
function evictOldest(assets, maxItems) {
    if (maxItems <= 0) {
        return [];
    }
    const newestFirst = sortByNewest(assets);
    return newestFirst.slice(0, maxItems);
}
