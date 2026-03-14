/**
 * Pexels API adapter for image search (backup provider).
 */

import { logger } from '../utils/logger.js';

export interface PexelsImageResult {
  url: string;
  thumbnailUrl: string;
  description: string;
  credit: string;
  downloadUrl: string;
}

/**
 * Search Pexels for images matching keywords.
 */
export async function searchPexels(
  keywords: string[],
  apiKey: string,
  count: number = 1,
): Promise<PexelsImageResult[]> {
  if (!apiKey) {
    logger.warn('Pexels API key not configured');
    return [];
  }

  const query = keywords.join(' ');
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      if (res.status === 429) logger.warn('Pexels rate limit reached');
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as {
      photos: Array<{
        src: { large: string; medium: string };
        alt?: string;
        photographer: string;
        url: string;
      }>;
    };

    return (data.photos ?? []).map((photo) => ({
      url: photo.src.large,
      thumbnailUrl: photo.src.medium,
      description: photo.alt ?? '',
      credit: `Photo by ${photo.photographer} on Pexels`,
      downloadUrl: photo.src.large,
    }));
  } catch (err) {
    logger.error(`Pexels search failed: ${(err as Error).message}`);
    return [];
  }
}
