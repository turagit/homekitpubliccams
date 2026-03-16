import { SourceType } from '../config/types';
import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface M20ImageFiles {
  small: string;
  medium: string;
  large: string;
  full_res: string;
}

interface M20RawImageItem {
  imageid: string;
  sol: number;
  instrument: string;
  date_taken_utc: string;
  credit: string;
  sample_type: string;
  image_files: M20ImageFiles;
  title?: string;
}

interface M20RawResponse {
  images: M20RawImageItem[];
  total_results: number;
  total_images: number;
}

const INSTRUMENT_MAP: Record<string, { instrument: string; title: string }> = {
  'm20-front-left': { instrument: 'FRONT_HAZCAM_LEFT_A', title: 'Perseverance Front Hazcam Left' },
  'm20-front-right': { instrument: 'FRONT_HAZCAM_RIGHT_A', title: 'Perseverance Front Hazcam Right' },
};

export class M20RawSource extends BaseSourceAdapter {
  private readonly sourceType: SourceType;
  private readonly instrument: string;
  private readonly sourceTitle: string;

  constructor(sourceType: SourceType) {
    super();
    this.sourceType = sourceType;
    const mapping = INSTRUMENT_MAP[sourceType];
    if (!mapping) {
      throw new Error(`Unknown M20 source type: ${sourceType}`);
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
    // Use the `search` parameter to filter by instrument server-side.
    // Without it, hazcam images are buried 500+ items deep in the feed.
    const params = new URLSearchParams({
      feed: 'raw_images',
      category: 'mars2020',
      feedtype: 'json',
      order: 'sol desc',
      num: '50',
      page: '0',
      search: this.instrument,
    });

    const url = `https://mars.nasa.gov/rss/api/?${params.toString()}`;
    const response = await this.http.fetchJson<M20RawResponse>(url, { timeoutMs: 60000 });
    const data = response.data;

    // Debug: log top-level keys and counts to diagnose empty results
    if (data) {
      const keys = Object.keys(data);
      const imageCount = Array.isArray(data.images) ? data.images.length : 'not-array';
      console.log(`[M20 debug] keys=${keys.join(',')}, images=${imageCount}, total=${data.total_results}`);
      if (Array.isArray(data.images) && data.images.length > 0) {
        const first = data.images[0];
        console.log(`[M20 debug] first: instrument=${first.instrument}, sample_type=${first.sample_type}, imageid=${first.imageid}`);
      }
    } else {
      console.log(`[M20 debug] response.data is ${data}`);
    }

    const allItems = data?.images ?? [];

    // Filter to full-size images only (exclude thumbnails)
    const images = allItems.filter(
      (img) => img.instrument === this.instrument && img.sample_type === 'Full',
    );

    return images.map((img) => ({
      id: `m20-${this.instrument}-${img.imageid}`,
      sourceId: this.sourceType,
      title: img.title || `Sol ${img.sol} — ${this.instrument}`,
      canonicalUrl: `https://mars.nasa.gov/mars2020/multimedia/raw-images/${img.imageid}`,
      imageUrl: img.image_files.large || img.image_files.full_res,
      publishedDate: img.date_taken_utc,
      description: `Perseverance ${this.instrument} — Sol ${img.sol}`,
      credits: img.credit || 'NASA/JPL-Caltech',
    }));
  }
}
