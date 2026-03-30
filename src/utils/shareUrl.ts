/**
 * Share URL builder and parser for Sudojo puzzle sharing.
 *
 * - Daily puzzles share just `/daily`
 * - Level/enter puzzles share `/play/puzzle?level=...&original=...&user=...&autopencilmarks=...&pencilmarks=...&hint=...`
 *
 * Pencilmarks are appended as a raw comma-separated string (not URL-encoded)
 * to keep URLs readable.
 */

const DEFAULT_DOMAIN = 'https://sudojo.com';

export interface ShareUrlParams {
  type: 'daily' | 'puzzle';
  /** 81-char original puzzle string */
  original?: string;
  /** 81-char user input string */
  user?: string;
  /** Comma-separated pencilmarks string (81 cells, 80 commas) */
  pencilmarks?: string;
  /** Whether auto-pencilmarks are enabled */
  autopencilmarks?: boolean;
  /** Difficulty level (1-based) */
  level?: number;
  /** Hint step index (0-based). Only included when hint is active. */
  hint?: number;
  /** Base domain (default: https://sudojo.com) */
  domain?: string;
}

export interface ParsedShareParams {
  original: string;
  user: string;
  pencilmarks: string;
  autopencilmarks: boolean;
  level?: number;
  hint?: number;
}

/**
 * Build a share URL from game state.
 *
 * Pencilmarks are appended directly to the URL (without URLSearchParams
 * encoding) so commas remain as literal commas.
 */
export function buildShareUrl(params: ShareUrlParams): string {
  const domain = params.domain ?? DEFAULT_DOMAIN;

  if (params.type === 'daily') {
    return `${domain}/daily`;
  }

  const searchParams = new URLSearchParams();
  if (params.level != null) {
    searchParams.set('level', String(params.level));
  }
  if (params.original) {
    searchParams.set('original', params.original);
  }
  if (params.user) {
    searchParams.set('user', params.user);
  }
  if (params.autopencilmarks != null) {
    searchParams.set('autopencilmarks', String(params.autopencilmarks));
  }

  let url = `${domain}/play/puzzle?${searchParams.toString()}`;

  // Append pencilmarks raw (commas don't need encoding in URLs)
  if (params.pencilmarks != null) {
    url += `&pencilmarks=${params.pencilmarks}`;
  }
  // Append hint step
  if (params.hint != null) {
    url += `&hint=${params.hint}`;
  }

  return url;
}

/**
 * Parse share URL query parameters into game state.
 * Returns null if required params (original, user) are missing.
 */
export function parseShareParams(
  params: URLSearchParams
): ParsedShareParams | null {
  const original = params.get('original');
  const user = params.get('user');

  if (!original || !user) {
    return null;
  }

  const levelStr = params.get('level');
  const hintStr = params.get('hint');

  const result: ParsedShareParams = {
    original,
    user,
    pencilmarks: params.get('pencilmarks') ?? '',
    autopencilmarks: params.get('autopencilmarks') === 'true',
  };
  if (levelStr) {
    result.level = Number(levelStr);
  }
  if (hintStr != null) {
    const hintNum = Number(hintStr);
    if (!isNaN(hintNum) && hintNum >= 0) {
      result.hint = hintNum;
    }
  }
  return result;
}

/**
 * Derive the web app URL from an API base URL.
 *
 * - Localhost: kept as-is (web app and API share the same server in dev)
 * - Production: strips the `api.` subdomain
 *   (e.g. `https://api.sudojo.com` → `https://sudojo.com`)
 */
export function getWebUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    if (url.hostname !== 'localhost' && url.hostname.startsWith('api.')) {
      url.hostname = url.hostname.replace(/^api\./, '');
    }
    return url.origin;
  } catch {
    return DEFAULT_DOMAIN;
  }
}
