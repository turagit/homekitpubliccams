import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface MarsPhoto {
  id: number;
  sol: number;
  camera: {
    id: number;
    name: string;
    rover_id: number;
    full_name: string;
  };
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
    max_sol: number;
    max_date: string;
  };
}

interface MarsPhotosResponse {
  photos: MarsPhoto[];
  latest_photos?: MarsPhoto[];
}

export class MarsSource extends BaseSourceAdapter {
  constructor(
    private readonly rover: 'curiosity' | 'perseverance',
    apiKey?: string,
  ) {
    super(apiKey);
  }

  public getSourceInfo(): SourceInfo {
    return {
      id: this.rover,
      title: this.rover === 'curiosity' ? 'Curiosity Rover' : 'Perseverance Rover',
      recommendedRefreshIntervalSec: 900, // 15 minutes
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    // Try latest_photos endpoint first (most recent available)
    const url = this.nasaApiUrl(`/mars-photos/api/v1/rovers/${this.rover}/latest_photos`);
    const response = await this.http.fetchJson<MarsPhotosResponse>(url);

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
