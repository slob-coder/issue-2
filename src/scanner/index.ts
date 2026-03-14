/**
 * HotspotScanner — fetches and scores hotspots from multiple sources.
 */

import type { Hotspot, SourceConfig } from './types.js';
import { fetchRSS } from './rss.js';
import { logger } from '../utils/logger.js';

/**
 * Compute relevance score based on keyword matching.
 * Returns a value between 0 and 1.
 */
function scoreRelevance(hotspot: Hotspot, industry: string): number {
  const keywords = industry.toLowerCase().split(/[，,\s]+/).filter(Boolean);
  if (keywords.length === 0) return 0.5; // no keywords → neutral score

  const text = `${hotspot.title} ${hotspot.summary}`.toLowerCase();
  let matched = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) matched++;
  }

  // Base score from keyword match ratio
  const keywordScore = matched / keywords.length;

  // Recency bonus: newer items get a small boost (max 0.1)
  const ageMs = Date.now() - new Date(hotspot.publishedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, 0.1 * (1 - ageHours / 72)); // within 72h

  return Math.min(1, keywordScore * 0.9 + recencyBonus);
}

/**
 * Scan all enabled sources and return scored, sorted hotspots.
 *
 * @param sources - configured data sources
 * @param industry - industry keywords for relevance scoring
 * @param topN - maximum number of hotspots to return
 * @param minRelevance - minimum relevance score threshold
 */
export async function scanHotspots(
  sources: SourceConfig[],
  industry: string,
  topN: number,
  minRelevance: number = 0.3,
): Promise<Hotspot[]> {
  const enabledSources = sources.filter((s) => s.enabled);
  if (enabledSources.length === 0) {
    logger.warn('No enabled sources configured');
    return [];
  }

  logger.info(`Scanning ${enabledSources.length} source(s)...`);

  // Fetch all sources concurrently
  const results = await Promise.allSettled(
    enabledSources.map((src) => {
      if (src.type === 'rss') return fetchRSS(src);
      // API type — treat URL as a JSON endpoint
      return fetchAPISource(src);
    }),
  );

  // Collect all hotspots
  const allHotspots: Hotspot[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allHotspots.push(...result.value);
    }
  }

  // Score and sort
  for (const h of allHotspots) {
    h.relevanceScore = scoreRelevance(h, industry);
  }

  const filtered = allHotspots
    .filter((h) => h.relevanceScore >= minRelevance)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topN);

  logger.info(`Scan complete: ${allHotspots.length} total, ${filtered.length} after filtering`);
  return filtered;
}

/**
 * Fetch hotspots from a generic JSON API endpoint.
 */
async function fetchAPISource(source: SourceConfig): Promise<Hotspot[]> {
  try {
    logger.info(`Fetching API: ${source.name} (${source.url})`);
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'wechat-writer/1.0 (OpenClaw Skill)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { items?: Array<Record<string, unknown>> };
    const items = data.items ?? (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);

    const hotspots: Hotspot[] = items.slice(0, 30).map((item: Record<string, unknown>) => ({
      title: String(item['name'] ?? item['title'] ?? item['full_name'] ?? ''),
      summary: String(item['description'] ?? item['summary'] ?? '').slice(0, 200),
      source: source.name,
      sourceUrl: source.url,
      articleUrl: String(item['html_url'] ?? item['url'] ?? item['link'] ?? ''),
      publishedAt: String(item['created_at'] ?? item['published_at'] ?? new Date().toISOString()),
      relevanceScore: 0,
    }));

    logger.info(`  ✅ ${source.name} — ${hotspots.length} 条`);
    return hotspots;
  } catch (err) {
    logger.warn(`  ⚠️ ${source.name} 获取失败: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Group hotspots by source name.
 */
export function groupBySource(hotspots: Hotspot[]): Record<string, Hotspot[]> {
  const groups: Record<string, Hotspot[]> = {};
  for (const h of hotspots) {
    if (!groups[h.source]) groups[h.source] = [];
    groups[h.source].push(h);
  }
  return groups;
}

export type { Hotspot, SourceConfig };
