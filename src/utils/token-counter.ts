/**
 * Token counter utility for LLM optimization.
 * Uses a rough heuristic: ~4 chars per token for English, ~2 chars per CJK character.
 */

export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // CJK characters are roughly 1 token each
    if (code >= 0x4e00 && code <= 0x9fff) {
      tokens += 1;
    } else if (code >= 0x3000 && code <= 0x303f) {
      // CJK punctuation
      tokens += 1;
    } else {
      // Latin characters ~4 chars per token
      tokens += 0.25;
    }
  }
  return Math.ceil(tokens);
}

/**
 * Truncate text to fit within a token budget, preserving complete sentences.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  if (estimateTokens(text) <= maxTokens) return text;

  const sentences = text.split(/(?<=[。！？.!?\n])/);
  let result = '';
  for (const sentence of sentences) {
    const candidate = result + sentence;
    if (estimateTokens(candidate) > maxTokens) break;
    result = candidate;
  }
  return result || text.slice(0, maxTokens * 2); // fallback
}
