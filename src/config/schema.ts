/**
 * Configuration schema and types
 */

export interface TopicConfig {
  count: number;
  min_relevance: number;
  show_sources: boolean;
}

export interface SourceConfig {
  name: string;
  type: 'rss' | 'api';
  url: string;
  enabled: boolean;
}

export interface ArticleConfig {
  format: 'html';
  theme: 'default' | 'dark' | 'elegant' | 'tech';
  primary_color: string;
  font_family: string;
  line_height: number;
  indent_first_line: boolean;
  code_theme: string;
}

export interface WritingConfig {
  default_style: 'professional' | 'storytelling' | 'opinion' | 'tutorial' | 'casual';
  tone: string;
  target_length: number;
  language: string;
}

export interface WeChatConfig {
  appid: string;
  secret: string;
  author: string;
  enable_comment: boolean;
}

export interface ImagesConfig {
  provider: 'unsplash' | 'pexels' | 'ai';
  api_key: string;
  default_count: number;
  style: string;
}

export interface OptimizationConfig {
  max_hotspot_summary_tokens: number;
  max_article_tokens: number;
  enable_incremental_edit: boolean;
  batch_topic_threshold: number;
}

export interface AppConfig {
  industry: string;
  topic: TopicConfig;
  sources: SourceConfig[];
  article: ArticleConfig;
  writing: WritingConfig;
  wechat: WeChatConfig;
  images: ImagesConfig;
  optimization: OptimizationConfig;
}

/** Default configuration values */
export const DEFAULT_CONFIG: AppConfig = {
  industry: '人工智能',
  topic: {
    count: 20,
    min_relevance: 0.3,
    show_sources: true,
  },
  sources: [
    {
      name: 'Hacker News',
      type: 'rss',
      url: 'https://hnrss.org/newest?points=100',
      enabled: true,
    },
    {
      name: '36氪',
      type: 'rss',
      url: 'https://36kr.com/feed',
      enabled: true,
    },
    {
      name: 'InfoQ中文',
      type: 'rss',
      url: 'https://www.infoq.cn/feed',
      enabled: true,
    },
  ],
  article: {
    format: 'html',
    theme: 'default',
    primary_color: '#1a73e8',
    font_family: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    line_height: 1.8,
    indent_first_line: false,
    code_theme: 'github',
  },
  writing: {
    default_style: 'professional',
    tone: '专业但不枯燥',
    target_length: 2000,
    language: 'zh-CN',
  },
  wechat: {
    appid: '',
    secret: '',
    author: '',
    enable_comment: false,
  },
  images: {
    provider: 'unsplash',
    api_key: '',
    default_count: 3,
    style: 'tech',
  },
  optimization: {
    max_hotspot_summary_tokens: 3000,
    max_article_tokens: 4000,
    enable_incremental_edit: true,
    batch_topic_threshold: 10,
  },
};

/**
 * Validate a config object, returning an array of error messages.
 */
export function validateConfig(config: Partial<AppConfig>): string[] {
  const errors: string[] = [];

  if (config.topic) {
    if (typeof config.topic.count === 'number' && config.topic.count < 1) {
      errors.push('topic.count must be >= 1');
    }
    if (typeof config.topic.min_relevance === 'number' &&
        (config.topic.min_relevance < 0 || config.topic.min_relevance > 1)) {
      errors.push('topic.min_relevance must be between 0 and 1');
    }
  }

  if (config.sources) {
    if (!Array.isArray(config.sources)) {
      errors.push('sources must be an array');
    } else {
      for (const [i, src] of config.sources.entries()) {
        if (!src.name) errors.push(`sources[${i}].name is required`);
        if (!src.url) errors.push(`sources[${i}].url is required`);
        if (!['rss', 'api'].includes(src.type)) {
          errors.push(`sources[${i}].type must be 'rss' or 'api'`);
        }
      }
    }
  }

  if (config.article) {
    const validThemes = ['default', 'dark', 'elegant', 'tech'];
    if (config.article.theme && !validThemes.includes(config.article.theme)) {
      errors.push(`article.theme must be one of: ${validThemes.join(', ')}`);
    }
  }

  if (config.writing) {
    const validStyles = ['professional', 'storytelling', 'opinion', 'tutorial', 'casual'];
    if (config.writing.default_style && !validStyles.includes(config.writing.default_style)) {
      errors.push(`writing.default_style must be one of: ${validStyles.join(', ')}`);
    }
  }

  return errors;
}
