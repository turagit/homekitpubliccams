import { BaseSourceAdapter, SourceAsset, SourceInfo } from './base-source';

interface ApodResponse {
  date: string;
  title: string;
  explanation?: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
}

export class ApodSource extends BaseSourceAdapter {
  constructor(apiKey?: string) {
    super(apiKey);
  }

  public getSourceInfo(): SourceInfo {
    return {
      id: 'apod',
      title: 'Astronomy Picture of the Day',
      recommendedRefreshIntervalSec: 21600, // 6 hours
    };
  }

  public async refreshIndex(): Promise<SourceAsset[]> {
    // Fetch the last 10 days of APOD entries
    const url = this.nasaApiUrl('/planetary/apod', { count: '10' });
    const response = await this.http.fetchJson<ApodResponse[]>(url);
    const items = Array.isArray(response.data) ? response.data : [response.data];

    return items
      .filter((item) => item.media_type === 'image' && item.url)
      .map((item) => ({
        id: `apod-${item.date}`,
        sourceId: 'apod',
        title: item.title || `APOD ${item.date}`,
        canonicalUrl: `https://apod.nasa.gov/apod/ap${item.date.replace(/-/g, '').slice(2)}.html`,
        // Prefer regular url over hdurl — HD images can be >20MB and cause download timeouts
        imageUrl: item.url,
        publishedDate: item.date,
        description: item.explanation,
        credits: item.copyright,
      }));
  }
}
