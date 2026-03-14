/**
 * ImageProvider — unified image search across providers.
 */

import type { ImagesConfig } from '../config/schema.js';
import { searchUnsplash, type ImageResult } from './unsplash.js';
import { searchPexels } from './pexels.js';
import { logger } from '../utils/logger.js';

export type { ImageResult };

/**
 * Search for images using the configured provider.
 * Falls back to secondary provider if primary fails.
 */
export async function searchImages(
  keywords: string[],
  config: ImagesConfig,
  count: number = 1,
): Promise<ImageResult[]> {
  const { provider, api_key } = config;

  // Try primary provider
  let results: ImageResult[] = [];

  if (provider === 'unsplash') {
    results = await searchUnsplash(keywords, api_key, count);
    if (results.length === 0) {
      logger.info('Falling back to Pexels...');
      results = await searchPexels(keywords, api_key, count);
    }
  } else if (provider === 'pexels') {
    results = await searchPexels(keywords, api_key, count);
    if (results.length === 0) {
      logger.info('Falling back to Unsplash...');
      results = await searchUnsplash(keywords, api_key, count);
    }
  }

  if (results.length === 0) {
    logger.warn(`No images found for keywords: ${keywords.join(', ')}`);
  }

  return results;
}

/**
 * Download an image to a local file.
 * Returns the local file path.
 */
export async function downloadImage(url: string, destPath: string): Promise<string> {
  const { writeFileSync } = await import('node:fs');
  const { mkdirSync, existsSync } = await import('node:fs');
  const { dirname } = await import('node:path');

  const dir = dirname(destPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed to download image: HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
  logger.info(`Image downloaded: ${destPath}`);
  return destPath;
}
