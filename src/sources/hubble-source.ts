import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

/**
 * Hubble source using the HubbleSite API (hubblesite.org/api)
 * and falling back to NASA Image Library search.
 */

interface HubbleSiteImage {
  id: number;
  name: string;
}

interface HubbleSiteImageDetail {
  name: string;
  description?: string;
  credits?: string;
  image_files: Array<{
    file_url: string;
    file_size: number;
    width: number;
    height: number;
  }>;
}

interface NasaLibItem {
  data: Array<{
    nasa_id: string;
    title: string;
    description?: string;
    date_created?: string;
    media_type: string;
  }>;
  links?: Array<{
    href: string;
    rel: string;
  }>;
}

interface NasaLibResponse {
  collection: { items: NasaLibItem[] };
}

export class HubbleSource extends BaseSourceAdapter {
  constructor(apiKey?: string) {
    super(apiKey);
  }

  public getSourceInfo(): SourceInfo {
    return { id: 'hubble', title: 'Hubble', recommendedRefreshIntervalSec: 7200 };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    try {
      return await this.fetchFromHubbleSite();
    } catch {
      return await this.fetchFromNasaLibrary();
    }
  }

  private async fetchFromHubbleSite(): Promise<SourceAsset[]> {
    // Get recent Hubble images
    const listUrl = 'https://hubblesite.org/api/v3/images?page=1&collection_name=news&order=desc';
    const listResponse = await this.http.fetchJson<HubbleSiteImage[]>(listUrl, { timeoutMs: 15000 });
    const images = Array.isArray(listResponse.data) ? listResponse.data.slice(0, 15) : [];

    if (images.length === 0) {
      throw new Error('No HubbleSite results');
    }

    const assets: SourceAsset[] = [];
    for (const img of images) {
      try {
        const detailUrl = `https://hubblesite.org/api/v3/image/${img.id}`;
        const detail = await this.http.fetchJson<HubbleSiteImageDetail>(detailUrl, { timeoutMs: 10000 });
        const d = detail.data;
        // Pick the largest JPEG/PNG image file
        const imageFile = d.image_files
          ?.filter((f) => /\.(jpg|jpeg|png)$/i.test(f.file_url))
          .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

        if (imageFile) {
          let fileUrl = imageFile.file_url;
          if (fileUrl.startsWith('//')) {
            fileUrl = 'https:' + fileUrl;
          }
          assets.push({
            id: `hubble-${img.id}`,
            sourceId: 'hubble',
            title: d.name || img.name,
            canonicalUrl: `https://hubblesite.org/contents/media/images/${img.id}`,
            imageUrl: fileUrl,
            description: d.description,
            credits: d.credits || 'NASA/ESA/Hubble',
            width: imageFile.width,
            height: imageFile.height,
          });
        }
      } catch {
        // Skip individual image errors
        continue;
      }
    }

    return assets;
  }

  private async fetchFromNasaLibrary(): Promise<SourceAsset[]> {
    const url = 'https://images-api.nasa.gov/search?q=hubble+space+telescope&media_type=image&page_size=20';
    const response = await this.http.fetchJson<NasaLibResponse>(url, { timeoutMs: 15000 });
    const items = response.data?.collection?.items ?? [];

    return items
      .filter((item) => {
        const d = item.data?.[0];
        const link = item.links?.find((l) => l.rel === 'preview');
        return d && d.media_type === 'image' && link?.href;
      })
      .map((item) => {
        const d = item.data[0];
        const link = item.links!.find((l) => l.rel === 'preview')!;
        return {
          id: `hubble-nasa-${d.nasa_id}`,
          sourceId: 'hubble',
          title: d.title,
          canonicalUrl: `https://images.nasa.gov/details/${d.nasa_id}`,
          imageUrl: link.href,
          publishedDate: d.date_created,
          description: d.description,
          credits: 'NASA/ESA/Hubble',
        };
      });
  }
}
