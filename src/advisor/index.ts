/**
 * TopicAdvisor — generates topic suggestions from hotspots.
 * Designed to be called by the OpenClaw agent's LLM layer.
 * This module prepares structured prompts and parses LLM responses.
 */

import type { Hotspot } from '../scanner/types.js';
import { groupBySource } from '../scanner/index.js';
import { truncateToTokenBudget } from '../utils/token-counter.js';
import { logger } from '../utils/logger.js';

/** Source attribution for a topic suggestion */
export interface TopicSource {
  name: string;
  title: string;
  url: string;
  publishedAt: string;
}

/** A single topic suggestion */
export interface TopicSuggestion {
  id: number;
  title: string;
  coreTakeaway: string;
  angle: string;
  targetAudience: string;
  recommendedStyle: string;
  sources: TopicSource[];
}

/**
 * Build the prompt for the LLM to generate topic suggestions.
 *
 * @param hotspots - scored and sorted hotspots
 * @param industry - industry name
 * @param count - number of topics to generate
 * @param maxTokens - token budget for hotspot summaries
 * @returns prompt string ready for LLM consumption
 */
export function buildTopicPrompt(
  hotspots: Hotspot[],
  industry: string,
  count: number,
  maxTokens: number = 3000,
): string {
  const grouped = groupBySource(hotspots);

  // Build hotspots section grouped by source
  const sourceSections: string[] = [];
  for (const [sourceName, items] of Object.entries(grouped)) {
    const top = items.slice(0, 5); // max 5 per source
    const lines = top.map(
      (h, i) =>
        `  ${i + 1}. ${h.title}\n     摘要: ${h.summary}\n     链接: ${h.articleUrl}\n     发布: ${h.publishedAt}`,
    );
    sourceSections.push(`【${sourceName}】\n${lines.join('\n')}`);
  }

  const hotspotText = truncateToTokenBudget(sourceSections.join('\n\n'), maxTokens);

  return `你是一位资深的 ${industry} 行业公众号编辑。
以下是近期行业热点（按来源分组）：

${hotspotText}

请推荐 ${count} 个公众号文章选题。每个选题必须包含：
1. title: 标题（吸引眼球但不标题党）
2. coreTakeaway: 核心论点（一句话）
3. angle: 写作角度
4. targetAudience: 目标读者
5. recommendedStyle: 推荐写作风格（professional/storytelling/opinion/tutorial/casual）
6. sources: 信息来源列表，每个包含 name（来源名称）、title（相关热点标题）、url（原文链接）、publishedAt（发布时间）

优先推荐跨来源交叉印证的话题。

请以 JSON 数组格式输出，每个元素包含上述字段。只输出 JSON，不要其他文字。`;
}

/**
 * Parse LLM response into TopicSuggestion array.
 */
export function parseTopicResponse(response: string): TopicSuggestion[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as TopicSuggestion[];
    if (!Array.isArray(parsed)) throw new Error('Expected JSON array');

    return parsed.map((item, i) => ({
      id: i + 1,
      title: item.title ?? '',
      coreTakeaway: item.coreTakeaway ?? '',
      angle: item.angle ?? '',
      targetAudience: item.targetAudience ?? '',
      recommendedStyle: item.recommendedStyle ?? 'professional',
      sources: Array.isArray(item.sources)
        ? item.sources.map((s) => ({
            name: s.name ?? '',
            title: s.title ?? '',
            url: s.url ?? '',
            publishedAt: s.publishedAt ?? '',
          }))
        : [],
    }));
  } catch (err) {
    logger.error('Failed to parse topic response:', (err as Error).message);
    return [];
  }
}

/**
 * Format topic suggestions for display to the user.
 */
export function formatTopicsForDisplay(topics: TopicSuggestion[], showSources: boolean): string {
  const lines: string[] = [`📋 为您推荐 ${topics.length} 个选题（按相关性排序）：\n`];

  for (const topic of topics) {
    lines.push(`${topic.id}. 《${topic.title}》`);
    lines.push(`   核心论点：${topic.coreTakeaway}`);
    lines.push(`   写作角度：${topic.angle}`);
    lines.push(`   目标读者：${topic.targetAudience}`);
    lines.push(`   推荐风格：${topic.recommendedStyle}`);

    if (showSources && topic.sources.length > 0) {
      lines.push(`   📰 来源：`);
      for (const src of topic.sources) {
        const date = src.publishedAt ? ` (${src.publishedAt.slice(0, 10)})` : '';
        lines.push(`   • [${src.name}] ${src.title}${date}`);
        if (src.url) lines.push(`     ${src.url}`);
      }
    }
    lines.push('');
  }

  lines.push('请输入编号选择选题，或描述你的写作思路。');
  return lines.join('\n');
}

/**
 * Determine if topic generation should be batched.
 * Returns batch sizes (e.g., [10, 10] for 20 topics).
 */
export function getBatchSizes(totalCount: number, threshold: number = 10): number[] {
  if (totalCount <= threshold) return [totalCount];
  const batches: number[] = [];
  let remaining = totalCount;
  while (remaining > 0) {
    const batch = Math.min(remaining, threshold);
    batches.push(batch);
    remaining -= batch;
  }
  return batches;
}
