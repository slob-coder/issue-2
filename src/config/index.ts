/**
 * Configuration loader — loads and merges config.yaml with defaults.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import yaml from 'js-yaml';
import { AppConfig, DEFAULT_CONFIG, validateConfig } from './schema.js';
import { logger } from '../utils/logger.js';

/**
 * Deep merge two objects. Source values override target values.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        tgtVal as Record<string, unknown>,
        srcVal as Record<string, unknown>,
      );
    } else if (srcVal !== undefined) {
      (result as Record<string, unknown>)[key as string] = srcVal;
    }
  }
  return result;
}

/**
 * Resolve the config file path. Searches:
 * 1. Explicit path argument
 * 2. ./config.yaml (skill directory)
 * 3. ~/.openclaw/skills/wechat-writer/config.yaml
 */
function resolveConfigPath(explicitPath?: string): string | null {
  if (explicitPath) {
    const p = resolve(explicitPath);
    return existsSync(p) ? p : null;
  }

  const candidates = [
    resolve(process.cwd(), 'config.yaml'),
    resolve(process.env['HOME'] ?? '~', '.openclaw/skills/wechat-writer/config.yaml'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Load configuration, merging user config.yaml over defaults.
 */
export function loadConfig(configPath?: string): AppConfig {
  const filePath = resolveConfigPath(configPath);
  if (!filePath) {
    logger.info('No config.yaml found, using default configuration');
    return { ...DEFAULT_CONFIG };
  }

  logger.info(`Loading config from ${filePath}`);
  const raw = readFileSync(filePath, 'utf-8');
  const userConfig = yaml.load(raw) as Partial<AppConfig>;

  const errors = validateConfig(userConfig);
  if (errors.length > 0) {
    logger.warn('Config validation warnings:');
    for (const e of errors) logger.warn(`  - ${e}`);
  }

  return deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    userConfig as unknown as Record<string, unknown>,
  ) as unknown as AppConfig;
}

export type { AppConfig };
export { DEFAULT_CONFIG, validateConfig };
