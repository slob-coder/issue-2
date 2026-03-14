/**
 * RSS feed parser adapter.
 * Fetches and parses RSS/Atom feeds into structured Hotspot objects.
 */

import RSSParser from 'rss-parser';
import type { Hotspot, SourceConfig } from './types.js';
import { logger } from '../utils/logger.js';

const parser = new RSSParser({
  timeout: 15_000,
  headers: {
    'User-Agent': 'wechat-writer/1.0 (OpenClaw Skill)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

/**
 * Fetch hotspots from a single RSS source.
 * Returns an empty array on failure (non-blocking).
 */
export async function fetchRSS(source: SourceConfig): Promise<Hotspot[]> {
  try {
    logger.info(`Fetching RSS: ${source.name} (${source.url})`);
    const feed = await parser.parseURL(source.url);

    const hotspots: Hotspot[] = (feed.items ?? []).map((item) => ({
      title: (item.title ?? '').trim(),
      summary: truncateSummary(item.contentSnippet ?? item.content ?? ''),
      source: source.name,
      sourceUrl: feed.link ?? source.url,
      articleUrl: item.link ?? '',
      publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      relevanceScore: 0, // scored later
    }));

    logger.info(`  ✅ ${source.name} — ${hotspots.length} 条`);
    return hotspots;
  } catch (err) {
    logger.warn(`  ⚠️ ${source.name} 获取失败: ${(err as Error).message}`);
    return [];
  }
}

/** Truncate summary to ~200 chars, preserving complete sentences. */
function truncateSummary(text: string): string {
  const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 200) return clean;
  const cut = clean.slice(0, 200);
  const lastSentence = cut.search(/[。！？.!?][^。！？.!?]*$/);
  return lastSentence > 50 ? cut.slice(0, lastSentence + 1) : cut + '…';
}
