/**
 * Tests for language utilities
 */

import { describe, expect, it } from 'vitest';
import {
  getLanguageNativeName,
  isSupportedLanguage,
  normalizeLanguageCode,
  resolveLanguage,
  SUPPORTED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
  toLanguageTag,
} from './language';

describe('SUPPORTED_LANGUAGES', () => {
  it('lists 15 unique lowercase codes', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(15);
    expect(new Set(SUPPORTED_LANGUAGE_CODES).size).toBe(15);
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      expect(code).toBe(code.toLowerCase());
    }
  });
});

describe('normalizeLanguageCode / resolveLanguage', () => {
  it('maps Traditional Chinese tags to zh-hant', () => {
    for (const tag of [
      'zh-Hant',
      'zh-Hant-TW',
      'zh-TW',
      'zh_HK',
      'zh-MO',
      'zh-hant',
    ]) {
      expect(normalizeLanguageCode(tag)).toBe('zh-hant');
    }
  });

  it('maps other Chinese tags to zh', () => {
    expect(normalizeLanguageCode('zh')).toBe('zh');
    expect(normalizeLanguageCode('zh-CN')).toBe('zh');
    expect(normalizeLanguageCode('zh-Hans-CN')).toBe('zh');
  });

  it('falls back to the base language', () => {
    expect(normalizeLanguageCode('pt-BR')).toBe('pt');
    expect(normalizeLanguageCode('EN_us')).toBe('en');
    expect(normalizeLanguageCode('ar')).toBeNull();
    expect(normalizeLanguageCode('')).toBeNull();
    expect(normalizeLanguageCode(null)).toBeNull();
  });

  it('resolves unsupported tags to en', () => {
    expect(resolveLanguage('ja-JP')).toBe('ja');
    expect(resolveLanguage('he-IL')).toBe('en');
    expect(resolveLanguage(undefined)).toBe('en');
  });
});

describe('helpers', () => {
  it('checks exact codes', () => {
    expect(isSupportedLanguage('zh-hant')).toBe(true);
    expect(isSupportedLanguage('zh-Hant')).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });

  it('formats BCP 47 tags and native names', () => {
    expect(toLanguageTag('zh-hant')).toBe('zh-Hant');
    expect(toLanguageTag('de')).toBe('de');
    expect(getLanguageNativeName('zh-TW')).toBe('繁體中文');
    expect(getLanguageNativeName('de')).toBe('Deutsch');
    expect(getLanguageNativeName('xx')).toBeUndefined();
  });
});
