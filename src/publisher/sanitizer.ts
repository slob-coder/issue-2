/**
 * HTML sanitizer for WeChat compatibility.
 * Strips unsupported tags/attributes and ensures all styles are inline.
 */

/** Tags allowed by WeChat public platform */
const ALLOWED_TAGS = new Set([
  'section', 'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 'del', 's',
  'a', 'img',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code',
  'figure', 'figcaption',
  'sup', 'sub',
]);

/** Attributes allowed on specific tags */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['style', 'class']),
  a: new Set(['href', 'target']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

/**
 * Sanitize HTML for WeChat compatibility.
 *
 * @param html - raw HTML content
 * @returns cleaned HTML safe for WeChat
 */
export function sanitizeForWeChat(html: string): string {
  let result = html;

  // Remove script and style tags entirely
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Remove unsupported tags but keep their content
  result = result.replace(/<\/?(\w+)([^>]*)>/g, (match, tag: string, attrs: string) => {
    const lowerTag = tag.toLowerCase();

    if (!ALLOWED_TAGS.has(lowerTag)) {
      // Keep content, remove tag
      return match.startsWith('</') ? '' : '';
    }

    // Sanitize attributes
    const cleanAttrs = sanitizeAttributes(lowerTag, attrs);
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }
    const selfClose = match.endsWith('/>') ? ' /' : '';
    return `<${lowerTag}${cleanAttrs}${selfClose}>`;
  });

  // Remove empty paragraphs
  result = result.replace(/<p[^>]*>\s*<\/p>/g, '');

  // Ensure no data: URIs in images (WeChat blocks these)
  result = result.replace(/src="data:[^"]*"/g, 'src=""');

  return result.trim();
}

/**
 * Sanitize attributes, keeping only allowed ones.
 */
function sanitizeAttributes(tag: string, attrsStr: string): string {
  if (!attrsStr.trim()) return '';

  const globalAllowed = ALLOWED_ATTRS['*'] ?? new Set();
  const tagAllowed = ALLOWED_ATTRS[tag] ?? new Set();
  const allowed = new Set([...globalAllowed, ...tagAllowed]);

  const attrRegex = /(\w[\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  const clean: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(attrsStr)) !== null) {
    const name = m[1].toLowerCase();
    if (allowed.has(name)) {
      const value = m[2] ?? m[3] ?? m[4] ?? '';
      clean.push(`${name}="${escapeAttr(value)}"`);
    }
  }

  return clean.length > 0 ? ' ' + clean.join(' ') : '';
}

/**
 * Replace image URLs in HTML content.
 * Used to swap local/external URLs with WeChat-uploaded URLs.
 */
export function replaceImageUrls(
  html: string,
  urlMap: Record<string, string>,
): string {
  let result = html;
  for (const [original, replacement] of Object.entries(urlMap)) {
    result = result.replaceAll(original, replacement);
  }
  return result;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
