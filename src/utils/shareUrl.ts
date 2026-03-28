/**
 * Share URL builder and parser for Sudojo puzzle sharing.
 *
 * - Daily puzzles share just `/daily`
 * - Level/enter puzzles share `/play/puzzle?level=...&original=...&user=...&autopencilmarks=...&pencilmarks=...`
 */

const DEFAULT_DOMAIN = 'https://sudojo.com';

export interface ShareUrlParams {
  type: 'daily' | 'puzzle';
  /** 81-char original puzzle string */
  original?: string;
  /** 81-char user input string */
  user?: string;
  /** Comma-separated pencilmarks string */
  pencilmarks?: string;
  /** Whether auto-pencilmarks are enabled */
  autopencilmarks?: boolean;
  /** Difficulty level (1-based) */
  level?: number;
  /** Base domain (default: https://sudojo.com) */
  domain?: string;
}

export interface ParsedShareParams {
  original: string;
  user: string;
  pencilmarks: string;
  autopencilmarks: boolean;
  level?: number;
}

/**
 * Build a share URL from game state.
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
  if (params.pencilmarks != null) {
    searchParams.set('pencilmarks', params.pencilmarks);
  }

  return `${domain}/play/puzzle?${searchParams.toString()}`;
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

  const result: ParsedShareParams = {
    original,
    user,
    pencilmarks: params.get('pencilmarks') ?? '',
    autopencilmarks: params.get('autopencilmarks') === 'true',
  };
  if (levelStr) {
    result.level = Number(levelStr);
  }
  return result;
}
