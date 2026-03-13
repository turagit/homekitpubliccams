import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface MarsPhoto {
  id: number;
  sol: number;
  camera: {
    name: string;
    full_name: string;
  };
  img_src: string;
  earth_date: string;
  rover: {
    name: string;
  };
}

interface MarsPhotosResponse {
  photos: MarsPhoto[];
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
      recommendedRefreshIntervalSec: 900,
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
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
        const response = await this.http.fetchJson<MarsPhotosResponse>(url);
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
      } catch {
        continue;
      }
    }

    return [];
  }

  /** Pick photos from different cameras to get visual variety. */
  private selectDiversePhotos(photos: MarsPhoto[], max: number): MarsPhoto[] {
    const byCam = new Map<string, MarsPhoto[]>();
    for (const p of photos) {
      const cam = p.camera.name;
      if (!byCam.has(cam)) byCam.set(cam, []);
      byCam.get(cam)!.push(p);
    }

    const result: MarsPhoto[] = [];
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
      if (!added) break;
      i++;
    }
    return result;
  }
}
