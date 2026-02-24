/**
 * Tests for theme utilities
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSystemTheme,
  isValidThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
} from './theme';

describe('THEME_STORAGE_KEY', () => {
  it('has the expected value', () => {
    expect(THEME_STORAGE_KEY).toBe('sudojo-theme');
  });
});

describe('getSystemTheme', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns light when matchMedia is not available (SSR)', () => {
    // The test environment uses happy-dom which has matchMedia mocked.
    // The setup.ts mocks matchMedia to return matches: false, so this returns 'light'.
    expect(getSystemTheme()).toBe('light');
  });

  it('returns dark when system prefers dark mode', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList
    );

    expect(getSystemTheme()).toBe('dark');
  });

  it('returns light when system does not prefer dark mode', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList
    );

    expect(getSystemTheme()).toBe('light');
  });
});

describe('resolveTheme', () => {
  it('returns light when preference is light', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('light', 'light')).toBe('light');
  });

  it('returns dark when preference is dark', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('dark', 'dark')).toBe('dark');
  });

  it('returns system theme when preference is system', () => {
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('system', 'dark')).toBe('dark');
  });
});

describe('isValidThemePreference', () => {
  it('returns true for valid theme preferences', () => {
    expect(isValidThemePreference('light')).toBe(true);
    expect(isValidThemePreference('dark')).toBe(true);
    expect(isValidThemePreference('system')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isValidThemePreference('auto')).toBe(false);
    expect(isValidThemePreference('')).toBe(false);
    expect(isValidThemePreference(null)).toBe(false);
    expect(isValidThemePreference(undefined)).toBe(false);
    expect(isValidThemePreference(42)).toBe(false);
    expect(isValidThemePreference({})).toBe(false);
  });
});
