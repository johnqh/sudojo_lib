/**
 * Theme utilities
 */

/** Available theme options */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Resolved theme (without system option) */
export type ResolvedTheme = 'light' | 'dark';

/** Storage key for theme preference */
export const THEME_STORAGE_KEY = 'sudojo-theme';

/**
 * Detect system color scheme preference
 *
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Resolve theme preference to actual theme
 *
 * @param preference - User's theme preference
 * @param systemTheme - Current system theme
 * @returns Resolved theme ('light' or 'dark')
 */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  if (preference === 'system') {
    return systemTheme;
  }
  return preference;
}

/**
 * Check if a value is a valid theme preference
 *
 * @param value - Value to check
 * @returns Whether value is a valid theme preference
 */
export function isValidThemePreference(
  value: unknown
): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}
