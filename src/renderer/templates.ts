/**
 * HTML template fragments for article rendering.
 * All styles are inline for WeChat compatibility.
 */

import type { Theme } from './themes.js';

/**
 * Generate the full HTML page wrapper for preview.
 */
export function wrapPreviewHTML(bodyContent: string, title: string, theme: Theme, fontFamily: string, lineHeight: number): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${fontFamily};
      line-height: ${lineHeight};
      color: ${theme.textColor};
      background: ${theme.backgroundColor};
      max-width: 677px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Render article title section.
 */
export function renderTitle(title: string, subtitle: string | undefined, author: string, theme: Theme): string {
  let html = `<h1 style="font-size:22px;font-weight:700;color:${theme.headingColor};margin:0 0 8px 0;line-height:1.4">${escape(title)}</h1>\n`;
  if (subtitle) {
    html += `<p style="font-size:15px;color:${theme.secondaryColor};margin:0 0 12px 0">${escape(subtitle)}</p>\n`;
  }
  if (author) {
    html += `<p style="font-size:13px;color:${theme.secondaryColor};margin:0 0 24px 0">✍️ ${escape(author)}</p>\n`;
  }
  return html;
}

/**
 * Render a heading section.
 */
export function renderHeading(text: string, level: number, theme: Theme): string {
  const sizes: Record<number, string> = { 2: '20px', 3: '17px', 4: '15px' };
  const size = sizes[level] ?? '17px';
  const marginTop = level === 2 ? '32px' : '24px';
  return `<h${level} style="font-size:${size};font-weight:700;color:${theme.headingColor};margin:${marginTop} 0 12px 0;line-height:1.4">${text}</h${level}>\n`;
}

/**
 * Render a paragraph section.
 */
export function renderParagraph(content: string, theme: Theme, indentFirstLine: boolean): string {
  const indent = indentFirstLine ? 'text-indent:2em;' : '';
  return `<p style="font-size:15px;color:${theme.textColor};margin:0 0 16px 0;${indent}line-height:1.8">${content}</p>\n`;
}

/**
 * Render a blockquote section.
 */
export function renderQuote(content: string, theme: Theme): string {
  return `<blockquote style="margin:16px 0;padding:12px 16px;background:${theme.quoteBackground};border-left:4px solid ${theme.quoteBorderColor};color:${theme.secondaryColor};font-size:14px;line-height:1.6;border-radius:0 4px 4px 0">${content}</blockquote>\n`;
}

/**
 * Render a code block section.
 */
export function renderCodeBlock(code: string, theme: Theme): string {
  return `<pre style="margin:16px 0;padding:16px;background:${theme.codeBackground};color:${theme.codeTextColor};border-radius:6px;font-size:13px;line-height:1.5;overflow-x:auto;font-family:'SFMono-Regular','Consolas','Liberation Mono','Menlo',monospace"><code>${code}</code></pre>\n`;
}

/**
 * Render a list section.
 */
export function renderList(items: string[], ordered: boolean, theme: Theme): string {
  const tag = ordered ? 'ol' : 'ul';
  const listStyle = ordered ? 'decimal' : 'disc';
  const lis = items.map((item) => `<li style="margin:4px 0;font-size:15px;color:${theme.textColor}">${item}</li>`).join('\n');
  return `<${tag} style="margin:16px 0;padding-left:24px;list-style:${listStyle}">\n${lis}\n</${tag}>\n`;
}

/**
 * Render a divider.
 */
export function renderDivider(theme: Theme): string {
  return `<hr style="margin:24px auto;border:none;border-top:1px solid ${theme.dividerColor};width:80%">\n`;
}

/**
 * Render an image section.
 */
export function renderImage(src: string, caption?: string, _theme?: Theme): string {
  let html = `<figure style="margin:20px 0;text-align:center">\n`;
  html += `  <img src="${escapeAttr(src)}" style="max-width:100%;border-radius:6px" alt="${escapeAttr(caption ?? '')}">\n`;
  if (caption) {
    html += `  <figcaption style="font-size:12px;color:#999;margin-top:6px">${escape(caption)}</figcaption>\n`;
  }
  html += `</figure>\n`;
  return html;
}

/**
 * Render a callout box (info/warning/tip).
 */
export function renderCallout(content: string, type: 'info' | 'warning' | 'tip', theme: Theme): string {
  const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', tip: '💡' };
  const bgs: Record<string, string> = {
    info: theme.calloutInfoBg,
    warning: theme.calloutWarningBg,
    tip: theme.calloutTipBg,
  };
  const borders: Record<string, string> = {
    info: theme.calloutInfoBorder,
    warning: theme.calloutWarningBorder,
    tip: theme.calloutTipBorder,
  };

  return `<div style="margin:16px 0;padding:12px 16px;background:${bgs[type]};border-left:4px solid ${borders[type]};border-radius:0 4px 4px 0;font-size:14px;line-height:1.6">${icons[type]} ${content}</div>\n`;
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
