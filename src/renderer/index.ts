/**
 * HTMLRenderer — converts structured ArticleContent to beautiful HTML.
 * Generates two versions:
 *   - preview.html: full HTML page for local browser preview
 *   - content.html: body-only HTML for WeChat publishing (inline styles)
 */

import type { ArticleConfig } from '../config/schema.js';
import { getTheme, type Theme } from './themes.js';
import { highlightCode } from './code-highlight.js';
import {
  wrapPreviewHTML,
  renderTitle,
  renderHeading,
  renderParagraph,
  renderQuote,
  renderCodeBlock,
  renderList,
  renderDivider,
  renderImage,
  renderCallout,
} from './templates.js';

/** Structured article content (output from LLM) */
export interface ArticleSection {
  type: 'heading' | 'paragraph' | 'quote' | 'code' | 'image' | 'list' | 'divider' | 'callout';
  level?: number;
  content?: string;
  language?: string;
  items?: string[];
  imageKeywords?: string[];
  imageCaption?: string;
  imageSrc?: string;
  calloutType?: 'info' | 'warning' | 'tip';
}

export interface ArticleContent {
  title: string;
  subtitle?: string;
  author: string;
  digest: string;
  coverImageKeywords: string[];
  sections: ArticleSection[];
}

export interface RenderResult {
  previewHTML: string;
  contentHTML: string;
}

/**
 * Render ArticleContent into HTML.
 */
export function renderArticle(
  content: ArticleContent,
  articleConfig: ArticleConfig,
): RenderResult {
  const theme = getTheme(articleConfig.theme, articleConfig.primary_color);
  const fontFamily = articleConfig.font_family;
  const lineHeight = articleConfig.line_height;
  const indent = articleConfig.indent_first_line;

  // Render body content
  let bodyHTML = renderTitle(content.title, content.subtitle, content.author, theme);
  bodyHTML += renderSections(content.sections, theme, indent);

  // Footer
  bodyHTML += renderDivider(theme);
  bodyHTML += `<p style="font-size:12px;color:${theme.secondaryColor};text-align:center;margin-top:16px">— END —</p>\n`;

  return {
    previewHTML: wrapPreviewHTML(bodyHTML, content.title, theme, fontFamily, lineHeight),
    contentHTML: bodyHTML,
  };
}

/**
 * Render an array of sections to HTML.
 */
function renderSections(sections: ArticleSection[], theme: Theme, indentFirstLine: boolean): string {
  let html = '';
  for (const section of sections) {
    html += renderSection(section, theme, indentFirstLine);
  }
  return html;
}

/**
 * Render a single section to HTML.
 */
function renderSection(section: ArticleSection, theme: Theme, indentFirstLine: boolean): string {
  switch (section.type) {
    case 'heading':
      return renderHeading(section.content ?? '', section.level ?? 2, theme);

    case 'paragraph':
      return renderParagraph(section.content ?? '', theme, indentFirstLine);

    case 'quote':
      return renderQuote(section.content ?? '', theme);

    case 'code': {
      const highlighted = highlightCode(section.content ?? '', section.language, theme);
      return renderCodeBlock(highlighted, theme);
    }

    case 'image':
      return renderImage(
        section.imageSrc ?? `https://via.placeholder.com/800x400?text=${encodeURIComponent(section.imageKeywords?.[0] ?? 'image')}`,
        section.imageCaption,
        theme,
      );

    case 'list':
      return renderList(section.items ?? [], false, theme);

    case 'divider':
      return renderDivider(theme);

    case 'callout':
      return renderCallout(section.content ?? '', section.calloutType ?? 'info', theme);

    default:
      return renderParagraph(section.content ?? '', theme, indentFirstLine);
  }
}

/**
 * Update specific sections in an ArticleContent (for incremental edits).
 */
export function updateSections(
  content: ArticleContent,
  updates: Array<{ index: number; section: ArticleSection }>,
): ArticleContent {
  const newSections = [...content.sections];
  for (const { index, section } of updates) {
    if (index >= 0 && index < newSections.length) {
      newSections[index] = section;
    }
  }
  return { ...content, sections: newSections };
}

export type { Theme };
