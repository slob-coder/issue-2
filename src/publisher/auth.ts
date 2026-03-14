/**
 * WeChat access_token management with file-based caching.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { logger } from '../utils/logger.js';

interface TokenCache {
  access_token: string;
  expires_at: number; // unix timestamp in ms
}

const EXPIRY_BUFFER_MS = 300_000; // refresh 5 minutes early

/**
 * Resolve the token cache file path.
 */
function getCachePath(): string {
  const home = process.env['HOME'] ?? '~';
  return resolve(home, '.openclaw/skills/wechat-writer/.token-cache.json');
}

/**
 * Read cached token if still valid.
 */
function readCache(): TokenCache | null {
  const path = getCachePath();
  if (!existsSync(path)) return null;

  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as TokenCache;
    if (data.expires_at > Date.now() + EXPIRY_BUFFER_MS) {
      return data;
    }
    logger.debug('Token cache expired');
    return null;
  } catch {
    return null;
  }
}

/**
 * Write token to cache file.
 */
function writeCache(token: TokenCache): void {
  const path = getCachePath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(path, JSON.stringify(token, null, 2), { mode: 0o600 });
  logger.debug('Token cached');
}

/**
 * Fetch a fresh access_token from WeChat API.
 */
async function fetchToken(appid: string, secret: string): Promise<TokenCache> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`WeChat token API HTTP ${res.status}`);

  const data = await res.json() as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg}`);
  }

  if (!data.access_token) {
    throw new Error('No access_token in response');
  }

  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 7200) * 1000,
  };
}

/**
 * Get a valid access_token, using cache when possible.
 */
export async function getAccessToken(appid: string, secret: string): Promise<string> {
  // Try cache first
  const cached = readCache();
  if (cached) {
    logger.debug('Using cached access_token');
    return cached.access_token;
  }

  // Fetch fresh token
  logger.info('Fetching new WeChat access_token...');
  const token = await fetchToken(appid, secret);
  writeCache(token);
  return token.access_token;
}
