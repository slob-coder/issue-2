/**
 * ArticleWriter — generates structured article content for HTML rendering.
 * Prepares prompts for the LLM and parses structured JSON responses.
 */

import type { TopicSuggestion } from '../advisor/index.js';
import type { ArticleContent, ArticleSection } from '../renderer/index.js';
import { getWritingStyle } from './styles.js';
import { logger } from '../utils/logger.js';

/**
 * Build the article generation prompt for the LLM.
 */
export function buildArticlePrompt(
  topic: TopicSuggestion,
  style: string,
  targetLength: number,
  industry: string,
  userInstructions?: string,
): string {
  const styleGuide = getWritingStyle(style);

  let prompt = `你是一位专业的 ${industry} 行业公众号写手。

## 选题
标题：${topic.title}
核心论点：${topic.coreTakeaway}
写作角度：${topic.angle}
目标读者：${topic.targetAudience}

## 参考来源
${topic.sources.map((s) => `- [${s.name}] ${s.title} (${s.publishedAt})\n  ${s.url}`).join('\n')}

## 写作要求
${styleGuide.promptGuidance}

- 目标字数：约 ${targetLength} 字
- 语言：中文
- 文章结构完整（引言、正文、结语）
- 适当使用小标题分段
- 每 2-3 段可插入配图位置`;

  if (userInstructions) {
    prompt += `\n\n## 用户特别要求\n${userInstructions}`;
  }

  prompt += `

## 输出格式
请以 JSON 格式输出，结构如下：
{
  "title": "文章标题",
  "subtitle": "副标题（可选）",
  "author": "作者名",
  "digest": "文章摘要（120字以内，用于公众号摘要）",
  "coverImageKeywords": ["封面图搜索关键词"],
  "sections": [
    { "type": "paragraph", "content": "引言内容..." },
    { "type": "heading", "level": 2, "content": "小标题" },
    { "type": "paragraph", "content": "正文段落..." },
    { "type": "image", "imageKeywords": ["关键词"], "imageCaption": "图片说明" },
    { "type": "quote", "content": "引用内容" },
    { "type": "code", "language": "python", "content": "代码内容" },
    { "type": "list", "items": ["列表项1", "列表项2"] },
    { "type": "callout", "calloutType": "tip", "content": "提示内容" },
    { "type": "divider" }
  ]
}

section types: heading, paragraph, quote, code, image, list, divider, callout
calloutType: info | warning | tip
heading level: 2-4

只输出 JSON，不要其他文字。`;

  return prompt;
}

/**
 * Build a prompt for incremental article edits.
 */
export function buildEditPrompt(
  currentContent: ArticleContent,
  editInstructions: string,
  sectionIndices?: number[],
): string {
  let sectionsContext: string;

  if (sectionIndices && sectionIndices.length > 0) {
    // Only send the relevant sections
    const relevant = sectionIndices.map((i) => ({
      index: i,
      section: currentContent.sections[i],
    }));
    sectionsContext = `需要修改的 sections（按 index 标识）：\n${JSON.stringify(relevant, null, 2)}`;
  } else {
    // Send all sections
    sectionsContext = `当前文章 sections：\n${JSON.stringify(currentContent.sections, null, 2)}`;
  }

  return `你是一位公众号文章编辑。请根据修改意见调整文章内容。

## 文章标题
${currentContent.title}

## ${sectionsContext}

## 修改意见
${editInstructions}

## 输出格式
请输出修改后的 sections JSON 数组。只包含需要修改的 section，每个带上 index 字段：
[
  { "index": 3, "type": "paragraph", "content": "修改后的内容..." },
  { "index": 5, "type": "heading", "level": 2, "content": "修改后的标题" }
]

只输出 JSON 数组，不要其他文字。`;
}

/**
 * Parse LLM response into ArticleContent.
 */
export function parseArticleResponse(response: string): ArticleContent | null {
  try {
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as ArticleContent;
    if (!parsed.title || !Array.isArray(parsed.sections)) {
      throw new Error('Missing required fields: title, sections');
    }

    return {
      title: parsed.title,
      subtitle: parsed.subtitle,
      author: parsed.author ?? '',
      digest: parsed.digest ?? '',
      coverImageKeywords: parsed.coverImageKeywords ?? [],
      sections: parsed.sections.map((s) => normalizeSection(s as unknown as Record<string, unknown>)),
    };
  } catch (err) {
    logger.error('Failed to parse article response:', (err as Error).message);
    return null;
  }
}

/**
 * Parse incremental edit response into section updates.
 */
export function parseEditResponse(response: string): Array<{ index: number; section: ArticleSection }> {
  try {
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as Array<{ index: number } & Record<string, unknown>>;
    if (!Array.isArray(parsed)) throw new Error('Expected JSON array');

    return parsed.map((item) => ({
      index: item.index,
      section: normalizeSection(item),
    }));
  } catch (err) {
    logger.error('Failed to parse edit response:', (err as Error).message);
    return [];
  }
}

/**
 * Normalize a section object to ensure required fields.
 */
function normalizeSection(raw: Record<string, unknown>): ArticleSection {
  const section: ArticleSection = {
    type: (raw['type'] as ArticleSection['type']) ?? 'paragraph',
  };

  if (raw['level']) section.level = Number(raw['level']);
  if (raw['content']) section.content = String(raw['content']);
  if (raw['language']) section.language = String(raw['language']);
  if (raw['items'] && Array.isArray(raw['items'])) section.items = raw['items'] as string[];
  if (raw['imageKeywords'] && Array.isArray(raw['imageKeywords'])) section.imageKeywords = raw['imageKeywords'] as string[];
  if (raw['imageCaption']) section.imageCaption = String(raw['imageCaption']);
  if (raw['imageSrc']) section.imageSrc = String(raw['imageSrc']);
  if (raw['calloutType']) section.calloutType = raw['calloutType'] as 'info' | 'warning' | 'tip';

  return section;
}
