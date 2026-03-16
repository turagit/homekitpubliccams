"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MslRawSource = void 0;
const base_source_1 = require("./base-source");
const INSTRUMENT_MAP = {
    'msl-front': { instrument: 'FHAZ_RIGHT_A', title: 'Curiosity Front Hazcam' },
    'msl-rear': { instrument: 'RHAZ_RIGHT_A', title: 'Curiosity Rear Hazcam' },
    'msl-left': { instrument: 'NAV_LEFT_A', title: 'Curiosity Left NavCam' },
    'msl-right': { instrument: 'NAV_RIGHT_A', title: 'Curiosity Right NavCam' },
};
class MslRawSource extends base_source_1.BaseSourceAdapter {
    sourceType;
    instrument;
    sourceTitle;
    constructor(sourceType) {
        super(); // No API key needed
        this.sourceType = sourceType;
        const mapping = INSTRUMENT_MAP[sourceType];
        if (!mapping) {
            throw new Error(`Unknown MSL source type: ${sourceType}`);
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
        const params = new URLSearchParams({
            order: 'sol desc,date_taken desc',
            per_page: '50',
            page: '0',
            mission: 'msl',
            instrument: this.instrument,
        });
        const url = `https://mars.nasa.gov/api/v1/raw_image_items/?${params.toString()}`;
        const response = await this.http.fetchJson(url, { timeoutMs: 30000 });
        const images = response.data?.images ?? [];
        return images
            .filter((img) => img.https_url)
            .map((img) => ({
            id: `msl-${this.instrument}-${img.id}`,
            sourceId: this.sourceType,
            title: img.title || `Sol ${img.sol} — ${this.instrument}`,
            canonicalUrl: `https://mars.nasa.gov/raw_images/`,
            imageUrl: img.https_url,
            publishedDate: img.date_taken,
            description: `Curiosity ${this.instrument} — Sol ${img.sol}`,
            credits: img.image_credit || 'NASA/JPL-Caltech',
        }));
    }
}
exports.MslRawSource = MslRawSource;
