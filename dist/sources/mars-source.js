"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarsSource = void 0;
const base_source_1 = require("./base-source");
class MarsSource extends base_source_1.BaseSourceAdapter {
    rover;
    constructor(rover, apiKey) {
        super(apiKey);
        this.rover = rover;
    }
    getSourceInfo() {
        return {
            id: this.rover,
            title: this.rover === 'curiosity' ? 'Curiosity Rover' : 'Perseverance Rover',
            recommendedRefreshIntervalSec: 900,
        };
    }
    async refreshIndex() {
        // Mars rover photos can lag weeks behind due to downlink/processing delays.
        // Sample dates going back 90 days, skipping every 3 days to limit API calls
        // to ~30 attempts max while covering a wide enough window.
        const datesToTry = [];
        for (let daysBack = 0; daysBack <= 90; daysBack += 3) {
            const date = new Date();
            date.setDate(date.getDate() - daysBack);
            datesToTry.push(date.toISOString().split('T')[0]);
        }
        for (const earthDate of datesToTry) {
            const url = this.nasaApiUrl(`/mars-photos/api/v1/rovers/${this.rover}/photos`, {
                earth_date: earthDate,
                page: '1',
            });
            try {
                const response = await this.http.fetchJson(url);
                const photos = response.data?.photos ?? [];
                if (photos.length === 0) {
                    continue;
                }
                const selected = this.selectDiversePhotos(photos, 20);
                return selected.map((photo) => ({
                    id: `mars-${this.rover}-${photo.id}`,
                    sourceId: this.rover,
                    title: `${photo.rover?.name ?? this.rover} — ${photo.camera.full_name} (Sol ${photo.sol})`,
                    canonicalUrl: photo.img_src,
                    imageUrl: photo.img_src,
                    publishedDate: photo.earth_date,
                    description: `${photo.camera.full_name} on Sol ${photo.sol} (${photo.earth_date})`,
                    credits: 'NASA/JPL-Caltech',
                }));
            }
            catch {
                continue;
            }
        }
        // If no photos found in the last 90 days, fall back to NASA Image Library
        return this.fetchFromNasaLibrary();
    }
    async fetchFromNasaLibrary() {
        const roverName = this.rover === 'curiosity' ? 'curiosity rover mars' : 'perseverance rover mars';
        const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(roverName)}&media_type=image&page_size=20`;
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
                id: `mars-nasa-${d.nasa_id}`,
                sourceId: this.rover,
                title: d.title,
                canonicalUrl: `https://images.nasa.gov/details/${d.nasa_id}`,
                imageUrl: link.href,
                publishedDate: d.date_created,
                description: d.description,
                credits: 'NASA/JPL-Caltech',
            };
        });
    }
    /** Pick photos from different cameras to get visual variety. */
    selectDiversePhotos(photos, max) {
        const byCam = new Map();
        for (const p of photos) {
            const cam = p.camera.name;
            if (!byCam.has(cam))
                byCam.set(cam, []);
            byCam.get(cam).push(p);
        }
        const result = [];
        const cameras = [...byCam.values()];
        let i = 0;
        while (result.length < max) {
            let added = false;
            for (const camPhotos of cameras) {
                if (i < camPhotos.length && result.length < max) {
                    result.push(camPhotos[i]);
                    added = true;
                }
            }
            if (!added)
                break;
            i++;
        }
        return result;
    }
}
exports.MarsSource = MarsSource;
