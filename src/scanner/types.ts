/**
 * HotspotScanner types
 */

/** A single hotspot item from a data source */
export interface Hotspot {
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  articleUrl: string;
  publishedAt: string;
  relevanceScore: number;
}

/** Source configuration */
export interface SourceConfig {
  name: string;
  type: 'rss' | 'api';
  url: string;
  enabled: boolean;
}
