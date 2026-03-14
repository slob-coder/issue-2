/**
 * Unsplash API adapter for image search.
 */

import { logger } from '../utils/logger.js';

export interface ImageResult {
  url: string;
  thumbnailUrl: string;
  description: string;
  credit: string;
  downloadUrl: string;
}

/**
 * Search Unsplash for images matching keywords.
 */
export async function searchUnsplash(
  keywords: string[],
  apiKey: string,
  count: number = 1,
): Promise<ImageResult[]> {
  if (!apiKey) {
    logger.warn('Unsplash API key not configured');
    return [];
  }

  const query = keywords.join(' ');
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 429) logger.warn('Unsplash rate limit reached');
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      results: Array<{
        urls: { regular: string; small: string };
        alt_description?: string;
        user: { name: string };
        links: { download: string };
      }>;
    };

    return (data.results ?? []).map((item) => ({
      url: item.urls.regular,
      thumbnailUrl: item.urls.small,
      description: item.alt_description ?? '',
      credit: `Photo by ${item.user.name} on Unsplash`,
      downloadUrl: item.links.download,
    }));
  } catch (err) {
    logger.error(`Unsplash search failed: ${(err as Error).message}`);
    return [];
  }
}
