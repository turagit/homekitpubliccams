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
        // Primary: try STScI MAST portal for JWST public release images
        try {
            return await this.fetchFromMast();
        }
        catch {
            // Fallback: use NASA Image Library search for JWST content
            return await this.fetchFromNasaLibrary();
        }
    }
    async fetchFromMast() {
        // MAST provides a public listing of JWST release images
        const url = 'https://mast.stsci.edu/api/v0/invoke?request={"service":"Mast.Jwst.Filtered.Nircam","params":{"columns":"filename","filters":[]},"format":"json","pagesize":20,"page":1}';
        const response = await this.http.fetchJson(url, { timeoutMs: 15000 });
        const files = response.data?.data ?? [];
        if (files.length === 0) {
            throw new Error('No MAST results');
        }
        return files
            .filter((f) => f.filename && /\.(jpg|jpeg|png|tif|fits)$/i.test(f.filename))
            .slice(0, 20)
            .map((f, i) => ({
            id: `jwst-mast-${i}-${f.filename}`,
            sourceId: 'jwst',
            title: `JWST - ${f.filename}`,
            canonicalUrl: `https://mast.stsci.edu/portal/Mashup/Clients/Mast/Portal.html`,
            imageUrl: `https://mast.stsci.edu/api/v0/download/file/${f.filename}`,
            credits: 'NASA/ESA/CSA/STScI',
        }));
    }
    async fetchFromNasaLibrary() {
        const url = 'https://images-api.nasa.gov/search?q=james+webb+space+telescope&media_type=image&page_size=20';
        const response = await this.http.fetchJson(url, { timeoutMs: 15000 });
        const items = response.data?.collection?.items ?? [];
        return items
            .filter((item) => {
            const d = item.data?.[0];
            const link = item.links?.find((l) => l.rel === 'preview');
            return d && d.media_type === 'image' && link?.href;
        })
            .map((item) => {
            const d = item.data[0];
            const link = item.links.find((l) => l.rel === 'preview');
            return {
                id: `jwst-nasa-${d.nasa_id}`,
                sourceId: 'jwst',
                title: d.title,
                canonicalUrl: `https://images.nasa.gov/details/${d.nasa_id}`,
                imageUrl: link.href,
                publishedDate: d.date_created,
                description: d.description,
                credits: 'NASA/ESA/CSA/STScI',
            };
        });
    }
}
exports.JwstSource = JwstSource;
