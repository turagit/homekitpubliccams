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
            recommendedRefreshIntervalSec: 900, // 15 minutes
        };
    }
    async refreshIndex() {
        // Try latest_photos endpoint first (most recent available)
        const url = this.nasaApiUrl(`/mars-photos/api/v1/rovers/${this.rover}/latest_photos`);
        const response = await this.http.fetchJson(url);
        const photos = response.data?.latest_photos ?? response.data?.photos ?? [];
        // Take up to 30 photos to avoid excessive downloads
        return photos.slice(0, 30).map((photo) => ({
            id: `mars-${this.rover}-${photo.id}`,
            sourceId: this.rover,
            title: `${photo.rover.name} - ${photo.camera.full_name} (Sol ${photo.sol})`,
            canonicalUrl: photo.img_src,
            imageUrl: photo.img_src,
            publishedDate: photo.earth_date,
            description: `${photo.camera.full_name} on Sol ${photo.sol} (${photo.earth_date})`,
            credits: 'NASA/JPL-Caltech',
        }));
    }
}
exports.MarsSource = MarsSource;
