"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwstSource = void 0;
const base_source_1 = require("./base-source");
class JwstSource extends base_source_1.BaseSourceAdapter {
    constructor(apiKey) {
        super(apiKey);
    }
    getSourceInfo() {
        return { id: 'jwst', title: 'JWST', recommendedRefreshIntervalSec: 7200 };
    }
    async refreshIndex() {
        // NASA Image Library is the reliable public source for JWST press images.
        // Results are thumbnail-sized JPEGs that are directly downloadable.
        const queries = [
            'james webb space telescope nebula',
            'james webb space telescope galaxy',
            'james webb JWST deep field',
        ];
        const assets = [];
        for (const q of queries) {
            try {
                const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=10`;
                const response = await this.http.fetchJson(url, { timeoutMs: 15000 });
                const items = response.data?.collection?.items ?? [];
                for (const item of items) {
                    const d = item.data?.[0];
                    const link = item.links?.find((l) => l.rel === 'preview');
                    if (!d || d.media_type !== 'image' || !link?.href)
                        continue;
                    assets.push({
                        id: `jwst-nasa-${d.nasa_id}`,
                        sourceId: 'jwst',
                        title: d.title,
                        canonicalUrl: `https://images.nasa.gov/details/${d.nasa_id}`,
                        imageUrl: link.href,
                        publishedDate: d.date_created,
                        description: d.description,
                        credits: 'NASA/ESA/CSA/STScI',
                    });
                }
            }
            catch {
                // If one query fails, continue with others
                continue;
            }
        }
        // Deduplicate by id
        const seen = new Set();
        return assets.filter((a) => {
            if (seen.has(a.id))
                return false;
            seen.add(a.id);
            return true;
        });
    }
}
exports.JwstSource = JwstSource;
