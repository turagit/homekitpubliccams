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
        // Use the `search` parameter to filter by instrument server-side.
        // Without it, hazcam images are buried 500+ items deep in the feed.
        const params = new URLSearchParams({
            feed: 'raw_images',
            category: 'mars2020',
            feedtype: 'json',
            order: 'sol desc',
            num: '50',
            page: '0',
            search: this.instrument,
        });
        const url = `https://mars.nasa.gov/rss/api/?${params.toString()}`;
        const response = await this.http.fetchJson(url, { timeoutMs: 60000 });
        const data = response.data;
        // Debug: log top-level keys and counts to diagnose empty results
        if (data) {
            const keys = Object.keys(data);
            const imageCount = Array.isArray(data.images) ? data.images.length : 'not-array';
            console.log(`[M20 debug] keys=${keys.join(',')}, images=${imageCount}, total=${data.total_results}`);
            if (Array.isArray(data.images) && data.images.length > 0) {
                const first = data.images[0];
                console.log(`[M20 debug] first: instrument=${first.instrument}, sample_type=${first.sample_type}, imageid=${first.imageid}`);
            }
        }
        else {
            console.log(`[M20 debug] response.data is ${data}`);
        }
        const allItems = data?.images ?? [];
        // Filter to full-size images only (exclude thumbnails)
        const images = allItems.filter((img) => img.instrument === this.instrument && img.sample_type === 'Full');
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
