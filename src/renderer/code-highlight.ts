/**
 * Minimal code syntax highlighting using inline CSS.
 * Supports basic keyword/string/comment highlighting for common languages.
 * No external JS dependencies — all styling is inline.
 */

import type { Theme } from './themes.js';

interface HighlightRule {
  pattern: RegExp;
  style: string;
}

const COMMON_RULES: HighlightRule[] = [
  // Comments
  { pattern: /(\/\/[^\n]*)/g, style: 'color:#6a737d;font-style:italic' },
  { pattern: /(\/\*[\s\S]*?\*\/)/g, style: 'color:#6a737d;font-style:italic' },
  { pattern: /(#[^\n]*)/g, style: 'color:#6a737d;font-style:italic' },
  // Strings
  { pattern: /("(?:[^"\\]|\\.)*")/g, style: 'color:#032f62' },
  { pattern: /('(?:[^'\\]|\\.)*')/g, style: 'color:#032f62' },
  { pattern: /(`(?:[^`\\]|\\.)*`)/g, style: 'color:#032f62' },
  // Numbers
  { pattern: /\b(\d+\.?\d*)\b/g, style: 'color:#005cc5' },
  // Keywords
  {
    pattern:
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|try|catch|throw|typeof|instanceof|default|switch|case|break|continue|do|in|of|yield|void|null|undefined|true|false|def|self|print|lambda|with|as|raise|pass|elif|None|True|False)\b/g,
    style: 'color:#d73a49;font-weight:600',
  },
  // Types / built-ins
  {
    pattern: /\b(string|number|boolean|object|any|never|void|Array|Promise|Map|Set|Date|Error|int|float|str|list|dict|tuple|bool)\b/g,
    style: 'color:#6f42c1',
  },
];

/**
 * Escape HTML entities.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Apply syntax highlighting to a code string.
 * Returns HTML with inline-styled spans.
 */
export function highlightCode(code: string, _language?: string, _theme?: Theme): string {
  let html = escapeHtml(code);

  // Apply rules in order. This is a simple sequential replacement approach.
  // For production use, a proper tokenizer would be better, but this is
  // lightweight and has zero dependencies.
  for (const rule of COMMON_RULES) {
    html = html.replace(rule.pattern, (match) => {
      // Don't re-highlight if already inside a span
      if (match.includes('<span')) return match;
      return `<span style="${rule.style}">${match}</span>`;
    });
  }

  return html;
}
