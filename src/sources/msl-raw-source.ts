import { SourceType } from '../config/types';
import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface MslRawImageItem {
  id: number;
  imageid: string;
  sol: number;
  instrument: string;
  url: string;
  https_url: string;
  title?: string;
  date_taken: string;
  image_credit?: string;
  is_thumbnail: boolean;
}

interface MslRawResponse {
  items: MslRawImageItem[];
  total: number;
}

// Curiosity's current (B-string) engineering cameras.
// The A-string cameras were used earlier in the mission; B-string is active now.
const INSTRUMENT_MAP: Record<string, { instrument: string; title: string }> = {
  'msl-front': { instrument: 'FHAZ_RIGHT_B', title: 'Curiosity Front Hazcam' },
  'msl-rear': { instrument: 'RHAZ_RIGHT_B', title: 'Curiosity Rear Hazcam' },
  'msl-left': { instrument: 'NAV_LEFT_B', title: 'Curiosity Left NavCam' },
  'msl-right': { instrument: 'NAV_RIGHT_B', title: 'Curiosity Right NavCam' },
};

export class MslRawSource extends BaseSourceAdapter {
  private readonly sourceType: SourceType;
  private readonly instrument: string;
  private readonly sourceTitle: string;

  constructor(sourceType: SourceType) {
    super();
    this.sourceType = sourceType;
    const mapping = INSTRUMENT_MAP[sourceType];
    if (!mapping) {
      throw new Error(`Unknown MSL source type: ${sourceType}`);
    }
    this.instrument = mapping.instrument;
    this.sourceTitle = mapping.title;
  }

  public getSourceInfo(): SourceInfo {
    return {
      id: this.sourceType,
      title: this.sourceTitle,
      recommendedRefreshIntervalSec: 14400, // 4 hours
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    // Fetch recent images across all instruments, then filter client-side.
    // The API's "instrument" query param doesn't actually filter; "search" does
    // but caps results at 1000 and returns old data. Fetching broadly and
    // filtering client-side is the most reliable approach.
    const params = new URLSearchParams({
      order: 'sol desc,date_taken desc',
      per_page: '100',
      page: '0',
      mission: 'msl',
    });

    const url = `https://mars.nasa.gov/api/v1/raw_image_items/?${params.toString()}`;
    const response = await this.http.fetchJson<MslRawResponse>(url, { timeoutMs: 30000 });
    const allItems = response.data?.items ?? [];

    // Filter to our specific instrument, exclude thumbnails
    const images = allItems.filter(
      (img) => img.instrument === this.instrument && !img.is_thumbnail,
    );

    return images.map((img) => ({
      id: `msl-${this.instrument}-${img.id}`,
      sourceId: this.sourceType,
      title: img.title || `Sol ${img.sol} — ${this.instrument}`,
      canonicalUrl: `https://mars.nasa.gov/raw_images/${img.id}`,
      imageUrl: img.https_url || img.url,
      publishedDate: img.date_taken,
      description: `Curiosity ${this.instrument} — Sol ${img.sol}`,
      credits: img.image_credit || 'NASA/JPL-Caltech',
    }));
  }
}
