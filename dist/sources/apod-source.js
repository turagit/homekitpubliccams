"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApodSource = void 0;
const base_source_1 = require("./base-source");
class ApodSource extends base_source_1.BaseSourceAdapter {
    constructor(apiKey) {
        super(apiKey);
    }
    getSourceInfo() {
        return {
            id: 'apod',
            title: 'Astronomy Picture of the Day',
            recommendedRefreshIntervalSec: 21600, // 6 hours
        };
    }
    async refreshIndex() {
        // Fetch the last 10 days of APOD entries
        const url = this.nasaApiUrl('/planetary/apod', { count: '10' });
        const response = await this.http.fetchJson(url);
        const items = Array.isArray(response.data) ? response.data : [response.data];
        return items
            .filter((item) => item.media_type === 'image' && item.url)
            .map((item) => ({
            id: `apod-${item.date}`,
            sourceId: 'apod',
            title: item.title || `APOD ${item.date}`,
            canonicalUrl: `https://apod.nasa.gov/apod/ap${item.date.replace(/-/g, '').slice(2)}.html`,
            imageUrl: item.hdurl || item.url,
            publishedDate: item.date,
            description: item.explanation,
            credits: item.copyright,
        }));
    }
}
exports.ApodSource = ApodSource;
