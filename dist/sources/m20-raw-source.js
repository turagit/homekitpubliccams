"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.M20RawSource = void 0;
const base_source_1 = require("./base-source");
const INSTRUMENT_MAP = {
    'm20-front-left': { instrument: 'FRONT_HAZCAM_LEFT_A', title: 'Perseverance Front Hazcam Left' },
    'm20-front-right': { instrument: 'FRONT_HAZCAM_RIGHT_A', title: 'Perseverance Front Hazcam Right' },
};
class M20RawSource extends base_source_1.BaseSourceAdapter {
    sourceType;
    instrument;
    sourceTitle;
    constructor(sourceType) {
        super();
        this.sourceType = sourceType;
        const mapping = INSTRUMENT_MAP[sourceType];
        if (!mapping) {
            throw new Error(`Unknown M20 source type: ${sourceType}`);
        }
        this.instrument = mapping.instrument;
        this.sourceTitle = mapping.title;
    }
    getSourceInfo() {
        return {
            id: this.sourceType,
            title: this.sourceTitle,
            recommendedRefreshIntervalSec: 14400, // 4 hours
        };
    }
    async refreshIndex() {
        // The RSS API is slow with large page sizes and doesn't support
        // server-side instrument filtering. Hazcam images are sparse —
        // they can be 500+ items deep. Use smaller pages (50) with a
        // longer timeout and scan up to 15 pages to find them.
        const collected = [];
        for (let page = 0; page < 15; page++) {
            const params = new URLSearchParams({
                feed: 'raw_images',
                category: 'mars2020',
                feedtype: 'json',
                order: 'sol desc',
                num: '50',
                page: String(page),
            });
            const url = `https://mars.nasa.gov/rss/api/?${params.toString()}`;
            const response = await this.http.fetchJson(url, { timeoutMs: 60000 });
            const pageItems = response.data?.images ?? [];
            collected.push(...pageItems);
            // Stop early if we already have enough matching images
            const matching = collected.filter((img) => img.instrument === this.instrument && img.sample_type === 'Full');
            if (matching.length >= 10) {
                break;
            }
            // Stop if no more pages
            if (pageItems.length === 0) {
                break;
            }
        }
        // Filter to our specific instrument, full-size only
        const images = collected.filter((img) => img.instrument === this.instrument && img.sample_type === 'Full');
        return images.map((img) => ({
            id: `m20-${this.instrument}-${img.imageid}`,
            sourceId: this.sourceType,
            title: img.title || `Sol ${img.sol} — ${this.instrument}`,
            canonicalUrl: `https://mars.nasa.gov/mars2020/multimedia/raw-images/${img.imageid}`,
            imageUrl: img.image_files.large || img.image_files.full_res,
            publishedDate: img.date_taken_utc,
            description: `Perseverance ${this.instrument} — Sol ${img.sol}`,
            credits: img.credit || 'NASA/JPL-Caltech',
        }));
    }
}
exports.M20RawSource = M20RawSource;
