/**
 * WeChatPublisher — handles draft creation and publishing.
 */

import { getAccessToken } from './auth.js';
import { uploadArticleImage, uploadPermanentImage } from './material.js';
import { sanitizeForWeChat, replaceImageUrls } from './sanitizer.js';
import { logger } from '../utils/logger.js';
import type { WeChatConfig } from '../config/schema.js';

export interface PublishResult {
  draftMediaId: string;
  publishId?: string;
  status: 'draft' | 'published' | 'failed';
  error?: string;
}

export interface DraftArticle {
  title: string;
  author: string;
  digest: string;
  content: string;       // HTML content
  thumbMediaId: string;  // cover image media_id
  contentSourceUrl?: string;
}

/**
 * Upload images used within the article content.
 * Returns a URL mapping: original URL → WeChat URL.
 */
export async function uploadContentImages(
  config: WeChatConfig,
  imagePaths: string[],
): Promise<Record<string, string>> {
  const token = await getAccessToken(config.appid, config.secret);
  const urlMap: Record<string, string> = {};

  for (const path of imagePaths) {
    try {
      const wechatUrl = await uploadArticleImage(token, path);
      urlMap[path] = wechatUrl;
      logger.info(`Uploaded content image: ${path} → ${wechatUrl}`);
    } catch (err) {
      logger.error(`Failed to upload image ${path}: ${(err as Error).message}`);
    }
  }

  return urlMap;
}

/**
 * Upload cover image and return media_id.
 */
export async function uploadCoverImage(
  config: WeChatConfig,
  imagePath: string,
): Promise<string> {
  const token = await getAccessToken(config.appid, config.secret);
  return uploadPermanentImage(token, imagePath);
}

/**
 * Create a draft on WeChat.
 */
export async function createDraft(
  config: WeChatConfig,
  article: DraftArticle,
): Promise<string> {
  const token = await getAccessToken(config.appid, config.secret);

  // Sanitize HTML content
  const cleanContent = sanitizeForWeChat(article.content);

  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
  const body = {
    articles: [
      {
        title: article.title,
        author: article.author,
        digest: article.digest,
        content: cleanContent,
        thumb_media_id: article.thumbMediaId,
        content_source_url: article.contentSourceUrl ?? '',
        need_open_comment: 0,
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json() as { media_id?: string; errcode?: number; errmsg?: string };
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg}`);
  }

  if (!data.media_id) throw new Error('No media_id in draft response');
  logger.info(`Draft created: ${data.media_id}`);
  return data.media_id;
}

/**
 * Publish a draft.
 */
export async function publishDraft(
  config: WeChatConfig,
  draftMediaId: string,
): Promise<string> {
  const token = await getAccessToken(config.appid, config.secret);

  const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: draftMediaId }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json() as { publish_id?: string; errcode?: number; errmsg?: string };
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg}`);
  }

  if (!data.publish_id) throw new Error('No publish_id in response');
  logger.info(`Published: ${data.publish_id}`);
  return data.publish_id;
}

/**
 * Check publish status.
 */
export async function getPublishStatus(
  config: WeChatConfig,
  publishId: string,
): Promise<{ status: number; articleUrl?: string }> {
  const token = await getAccessToken(config.appid, config.secret);

  const url = `https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publish_id: publishId }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json() as {
    publish_status?: number;
    article_detail?: { item?: Array<{ article_url?: string }> };
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg}`);
  }

  return {
    status: data.publish_status ?? -1,
    articleUrl: data.article_detail?.item?.[0]?.article_url,
  };
}

export { replaceImageUrls, sanitizeForWeChat };
