import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface NasaLibraryResponse {
  collection: {
    items: Array<{
      data: Array<{
        nasa_id: string;
        title: string;
        description?: string;
        date_created?: string;
        center?: string;
        keywords?: string[];
        media_type: string;
      }>;
      links?: Array<{
        href: string;
        rel: string;
        render?: string;
      }>;
    }>;
  };
}

export class NasaImageLibrarySource extends BaseSourceAdapter {
  private readonly searchTerms = ['space', 'galaxy', 'nebula', 'earth', 'moon', 'saturn', 'jupiter', 'mars'];
  private termIndex = 0;

  constructor(apiKey?: string) {
    super(apiKey);
  }

  public getSourceInfo(): SourceInfo {
    return {
      id: 'nasa-mixed',
      title: 'NASA Mixed Feed',
      recommendedRefreshIntervalSec: 1800, // 30 minutes
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    // Rotate through search terms to get variety
    const term = this.searchTerms[this.termIndex % this.searchTerms.length];
    this.termIndex++;

    // NASA Image and Video Library does NOT use api_key — it's a free, unauthenticated API
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(term)}&media_type=image&page_size=20`;
    const response = await this.http.fetchJson<NasaLibraryResponse>(url);
    const items = response.data?.collection?.items ?? [];

    return items
      .filter((item) => {
        const data = item.data?.[0];
        const link = item.links?.find((l) => l.rel === 'preview');
        return data && data.media_type === 'image' && link?.href;
      })
      .map((item) => {
        const data = item.data[0];
        const previewLink = item.links!.find((l) => l.rel === 'preview')!;
        // The preview link is a thumbnail; construct the full-res link from the nasa_id
        const imageUrl = previewLink.href.replace('~thumb', '~orig').replace('~small', '~orig');

        return {
          id: `nasa-${data.nasa_id}`,
          sourceId: 'nasa-mixed',
          title: data.title,
          canonicalUrl: `https://images.nasa.gov/details/${data.nasa_id}`,
          imageUrl: previewLink.href, // Use preview (reliable); orig may not exist
          publishedDate: data.date_created,
          description: data.description,
          credits: data.center,
        };
      });
  }
}
