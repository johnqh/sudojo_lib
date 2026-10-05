/**
 * Supported UI languages and locale-tag resolution.
 *
 * **Code casing.** Language codes here are lowercase (`zh-hant`), which is what
 * the web app uses (i18next `lowerCaseLng`, URL prefixes like `/zh-hant/play`),
 * what the API stores in `Community.language_code`, and how the locale
 * directories are named. The RN app keys its i18next resources as `zh-Hant`;
 * convert with {@link toLanguageTag} there.
 */

/** A supported UI language. */
export interface SupportedLanguageInfo {
  /** Lowercase language code, e.g. `en`, `zh-hant` */
  code: string;
  /** The language's name in itself, e.g. `Deutsch`, `繁體中文` */
  nativeName: string;
  /** Flag emoji shown next to the name in the RN language picker */
  flag: string;
}

/**
 * The 15 supported UI languages, in the web app's order.
 *
 * The two app copies differ only in the Chinese native names: the web says
 * `简体中文` / `繁體中文`, the RN app `中文简体` / `中文繁體`. The web names are used
 * here (the conventional word order).
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English', flag: '🇺🇸' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'pt', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'sv', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'th', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'uk', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'vi', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-hant', nativeName: '繁體中文', flag: '🇹🇼' },
] as const satisfies readonly SupportedLanguageInfo[];

/** A supported language code (lowercase). */
export type SupportedLanguageCode =
  (typeof SUPPORTED_LANGUAGES)[number]['code'];

/** All supported language codes, in SUPPORTED_LANGUAGES order. */
export const SUPPORTED_LANGUAGE_CODES: readonly SupportedLanguageCode[] =
  SUPPORTED_LANGUAGES.map(lang => lang.code);

/** The language used when nothing else matches. */
export const DEFAULT_LANGUAGE: SupportedLanguageCode = 'en';

/**
 * localStorage key for the web app's language preference (`'language'`, the
 * key i18next-browser-languagedetector and LanguageValidator use).
 */
export const LANGUAGE_STORAGE_KEY = 'language';

/** AsyncStorage key for the RN app's language preference (`'@sudojo/language'`). */
export const NATIVE_LANGUAGE_STORAGE_KEY = '@sudojo/language';

/** Whether `code` is a supported language code (exact, lowercase). */
export function isSupportedLanguage(
  code: string | null | undefined
): code is SupportedLanguageCode {
  return (
    !!code && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code)
  );
}

/**
 * Map a language code or locale tag to a supported language code, or null.
 *
 * Case and `_` / `-` are ignored. Traditional Chinese (`zh-Hant*`, `zh-TW`,
 * `zh-HK`, `zh-MO`) → `zh-hant`; any other `zh*` → `zh`. Otherwise the full
 * tag, then its base language (`pt-BR` → `pt`), must be supported.
 */
export function normalizeLanguageCode(
  code: string | null | undefined
): SupportedLanguageCode | null {
  if (!code) return null;
  const tag = code.trim().toLowerCase().replace(/_/g, '-');
  if (!tag) return null;
  if (
    tag.startsWith('zh-hant') ||
    tag.startsWith('zh-tw') ||
    tag.startsWith('zh-hk') ||
    tag.startsWith('zh-mo')
  ) {
    return 'zh-hant';
  }
  if (tag === 'zh' || tag.startsWith('zh-')) return 'zh';
  if (isSupportedLanguage(tag)) return tag;
  const base = tag.split('-')[0];
  return isSupportedLanguage(base) ? base : null;
}

/**
 * The supported language for a device/browser locale tag, or
 * {@link DEFAULT_LANGUAGE} when it is not supported.
 * Matches the RN app's device-language detection.
 */
export function resolveLanguage(
  localeTag: string | null | undefined
): SupportedLanguageCode {
  return normalizeLanguageCode(localeTag) ?? DEFAULT_LANGUAGE;
}

/**
 * BCP 47 casing of a language code, e.g. `zh-hant` → `zh-Hant` (the RN app's
 * i18next resource key). Other codes are returned unchanged.
 */
export function toLanguageTag(code: string): string {
  return code.toLowerCase() === 'zh-hant' ? 'zh-Hant' : code;
}

/** Native name of a language, or undefined for an unsupported code. */
export function getLanguageNativeName(
  code: string | null | undefined
): string | undefined {
  const normalized = normalizeLanguageCode(code);
  return SUPPORTED_LANGUAGES.find(lang => lang.code === normalized)?.nativeName;
}
