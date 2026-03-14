/**
 * WeChat material (素材) upload operations.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000];

/**
 * Upload an image for use within article content.
 * Returns the WeChat-hosted image URL.
 */
export async function uploadArticleImage(
  accessToken: string,
  imagePath: string,
): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`;
  return retryUpload(url, imagePath, 'url');
}

/**
 * Upload an image as permanent material (for cover images).
 * Returns the media_id.
 */
export async function uploadPermanentImage(
  accessToken: string,
  imagePath: string,
): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
  return retryUpload(url, imagePath, 'media_id');
}

/**
 * Upload with retry logic.
 */
async function retryUpload(
  url: string,
  imagePath: string,
  responseField: string,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 5000;
        logger.info(`Retry ${attempt}/${MAX_RETRIES}, waiting ${delay}ms...`);
        await sleep(delay);
      }

      const result = await doUpload(url, imagePath, responseField);
      return result;
    } catch (err) {
      lastError = err as Error;
      logger.warn(`Upload attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

/**
 * Perform a single upload request.
 */
async function doUpload(
  url: string,
  imagePath: string,
  responseField: string,
): Promise<string> {
  const fileData = readFileSync(imagePath);
  const fileName = basename(imagePath);

  // Build multipart/form-data manually
  const boundary = `----WebKitFormBoundary${Date.now().toString(36)}`;
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${fileName}"\r\nContent-Type: image/${getImageType(fileName)}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const headerBuf = Buffer.from(header, 'utf-8');
  const footerBuf = Buffer.from(footer, 'utf-8');
  const body = Buffer.concat([headerBuf, fileData, footerBuf]);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  if (data['errcode'] && data['errcode'] !== 0) {
    throw new Error(`WeChat API error ${data['errcode']}: ${data['errmsg']}`);
  }

  const value = data[responseField];
  if (!value) throw new Error(`Missing ${responseField} in response`);
  return String(value);
}

function getImageType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif' };
  return types[ext ?? ''] ?? 'jpeg';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
