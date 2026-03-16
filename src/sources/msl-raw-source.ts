import { SourceType } from '../config/types';
import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface MslRawImageItem {
  id: number;
  imageid: string;
  sol: number;
  instrument: string;
  https_url: string;
  title?: string;
  date_taken: string;
  image_credit?: string;
}

interface MslRawResponse {
  images: MslRawImageItem[];
  total: number;
}

const INSTRUMENT_MAP: Record<string, { instrument: string; title: string }> = {
  'msl-front': { instrument: 'FHAZ_RIGHT_A', title: 'Curiosity Front Hazcam' },
  'msl-rear': { instrument: 'RHAZ_RIGHT_A', title: 'Curiosity Rear Hazcam' },
  'msl-left': { instrument: 'NAV_LEFT_A', title: 'Curiosity Left NavCam' },
  'msl-right': { instrument: 'NAV_RIGHT_A', title: 'Curiosity Right NavCam' },
};

export class MslRawSource extends BaseSourceAdapter {
  private readonly sourceType: SourceType;
  private readonly instrument: string;
  private readonly sourceTitle: string;

  constructor(sourceType: SourceType) {
    super(); // No API key needed
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
    const params = new URLSearchParams({
      order: 'sol desc,date_taken desc',
      per_page: '50',
      page: '0',
      mission: 'msl',
      instrument: this.instrument,
    });

    const url = `https://mars.nasa.gov/api/v1/raw_image_items/?${params.toString()}`;
    const response = await this.http.fetchJson<MslRawResponse>(url, { timeoutMs: 30000 });
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
