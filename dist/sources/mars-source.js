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
        // Walk backward from today to find a day with photos.
        // Rovers don't always transmit every day (comm windows, dust storms, etc.).
        for (let daysBack = 0; daysBack <= 10; daysBack++) {
            const date = new Date();
            date.setDate(date.getDate() - daysBack);
            const earthDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
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
        return [];
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
