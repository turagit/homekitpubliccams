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
        // Step 1: get the rover manifest to find the most recent sol with photos
        const manifestUrl = this.nasaApiUrl(`/mars-photos/api/v1/manifests/${this.rover}`);
        const manifestResponse = await this.http.fetchJson(manifestUrl);
        const maxSol = manifestResponse.data?.photo_manifest?.max_sol;
        if (!maxSol) {
            throw new Error(`Could not determine max sol for ${this.rover}`);
        }
        // Step 2: fetch photos from the most recent sol. Walk back up to 5 sols
        // if the latest sol has no photos (can happen on communication blackouts).
        for (let solOffset = 0; solOffset <= 4; solOffset++) {
            const sol = maxSol - solOffset;
            const url = this.nasaApiUrl(`/mars-photos/api/v1/rovers/${this.rover}/photos`, {
                sol: String(sol),
                page: '1',
            });
            try {
                const response = await this.http.fetchJson(url);
                const photos = response.data?.photos ?? [];
                if (photos.length === 0) {
                    continue; // Try the previous sol
                }
                // Take up to 20 photos, prefer diverse cameras
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
