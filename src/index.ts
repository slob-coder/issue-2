/**
 * wechat-writer — Main entry point.
 *
 * This module is the CLI interface for the OpenClaw skill.
 * It exports all sub-modules for programmatic use and provides
 * a CLI command parser for the /wechat-writer command.
 */

// Re-export all modules for programmatic access
export { loadConfig } from './config/index.js';
export type { AppConfig } from './config/index.js';
export { DEFAULT_CONFIG, validateConfig } from './config/schema.js';
export { scanHotspots, groupBySource } from './scanner/index.js';
export type { Hotspot, SourceConfig } from './scanner/types.js';
export {
  buildTopicPrompt,
  parseTopicResponse,
  formatTopicsForDisplay,
  getBatchSizes,
} from './advisor/index.js';
export type { TopicSuggestion, TopicSource } from './advisor/index.js';
export {
  buildArticlePrompt,
  buildEditPrompt,
  parseArticleResponse,
  parseEditResponse,
} from './writer/index.js';
export { getWritingStyle, WRITING_STYLES } from './writer/styles.js';
export type { WritingStyle } from './writer/styles.js';
export { renderArticle, updateSections } from './renderer/index.js';
export type { ArticleContent, ArticleSection, RenderResult } from './renderer/index.js';
export { getTheme, THEMES } from './renderer/themes.js';
export type { Theme } from './renderer/themes.js';
export { searchImages, downloadImage } from './images/index.js';
export type { ImageResult } from './images/index.js';
export {
  uploadContentImages,
  uploadCoverImage,
  createDraft,
  publishDraft,
  getPublishStatus,
  sanitizeForWeChat,
  replaceImageUrls,
} from './publisher/index.js';
export { getAccessToken } from './publisher/auth.js';
export { highlightCode } from './renderer/code-highlight.js';
export { estimateTokens, truncateToTokenBudget } from './utils/token-counter.js';
export { logger, setLogLevel } from './utils/logger.js';

import { loadConfig } from './config/index.js';
import { scanHotspots } from './scanner/index.js';
import { buildTopicPrompt, formatTopicsForDisplay, parseTopicResponse } from './advisor/index.js';
import { renderArticle } from './renderer/index.js';
import { parseArticleResponse } from './writer/index.js';
import { logger } from './utils/logger.js';
import { writeFileSync } from 'node:fs';

/**
 * CLI subcommands for the /wechat-writer skill.
 */
const COMMANDS: Record<string, string> = {
  scan: '抓取热点并推荐选题',
  write: '根据选题撰写文章',
  publish: '发布文章到公众号',
  config: '配置行业/热点源/微信账号/主题',
  preview: '预览已生成的文章',
  help: '显示帮助信息',
};

/**
 * Parse CLI arguments and run the appropriate command.
 * This is primarily used when the skill is invoked directly via Node.js.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'scan') {
    await runScan();
    return;
  }

  if (command === 'preview') {
    const jsonFile = args[1];
    if (!jsonFile) {
      logger.error('Usage: wechat-writer preview <article.json>');
      process.exit(1);
    }
    await runPreview(jsonFile);
    return;
  }

  logger.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp(): void {
  console.log('wechat-writer — 微信公众号文章写手\n');
  console.log('命令:');
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(10)} ${desc}`);
  }
  console.log('\n使用方式: /wechat-writer <command> [options]');
}

async function runScan(): Promise<void> {
  const config = loadConfig();
  logger.info(`行业方向: ${config.industry}`);
  logger.info(`选题数量: ${config.topic.count}`);

  const topN = config.topic.count * 2;
  const hotspots = await scanHotspots(
    config.sources,
    config.industry,
    topN,
    config.topic.min_relevance,
  );

  if (hotspots.length === 0) {
    logger.warn('未获取到任何热点，请检查数据源配置');
    return;
  }

  const prompt = buildTopicPrompt(hotspots, config.industry, config.topic.count, config.optimization.max_hotspot_summary_tokens);
  console.log('\n--- Topic Generation Prompt ---');
  console.log(prompt);
  console.log('--- End Prompt ---\n');
  console.log('将上述 prompt 发送给 LLM，获取选题建议后使用 parseTopicResponse() 解析。');
}

async function runPreview(jsonFile: string): Promise<void> {
  const { readFileSync } = await import('node:fs');
  const raw = readFileSync(jsonFile, 'utf-8');
  const content = parseArticleResponse(raw);
  if (!content) {
    logger.error('Failed to parse article JSON');
    process.exit(1);
  }

  const config = loadConfig();
  const { previewHTML } = renderArticle(content, config.article);

  const outPath = '/tmp/wechat-writer-preview.html';
  writeFileSync(outPath, previewHTML, 'utf-8');
  console.log(`✅ Preview saved to: ${outPath}`);
  console.log('Open in browser to view.');
}

// Run CLI if executed directly
const isMainModule = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts');
if (isMainModule) {
  main().catch((err) => {
    logger.error('Fatal error:', err);
    process.exit(1);
  });
}
