/**
 * Tests for daily date utilities
 */

import { describe, expect, it } from 'vitest';
import {
  formatDailyDate,
  getUtcDateString,
  isStaleDaily,
  normalizeDailyDate,
} from './date';

describe('getUtcDateString', () => {
  it('uses the UTC calendar date', () => {
    expect(getUtcDateString(new Date('2026-10-05T23:30:00-05:00'))).toBe(
      '2026-10-06'
    );
    expect(getUtcDateString(new Date('2026-01-02T00:00:00Z'))).toBe(
      '2026-01-02'
    );
  });
});

describe('normalizeDailyDate', () => {
  it('keeps the calendar date of dates and timestamps', () => {
    expect(normalizeDailyDate('2026-10-05')).toBe('2026-10-05');
    expect(normalizeDailyDate('2026-10-05T00:00:00.000Z')).toBe('2026-10-05');
  });

  it('rejects invalid dates', () => {
    expect(normalizeDailyDate('2026-02-30')).toBeNull();
    expect(normalizeDailyDate('10/05/2026')).toBeNull();
    expect(normalizeDailyDate('')).toBeNull();
    expect(normalizeDailyDate(null)).toBeNull();
  });
});

describe('formatDailyDate', () => {
  it('formats as the local calendar date, without a UTC shift', () => {
    const expected = new Date(2026, 9, 5).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    expect(formatDailyDate('2026-10-05', 'en-US')).toBe(expected);
    expect(formatDailyDate('2026-10-05', 'en-US')).toContain('5');
  });

  it('accepts custom options', () => {
    expect(
      formatDailyDate('2026-10-05', 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    ).toBe('10/05/2026');
  });

  it('returns null for invalid input', () => {
    expect(formatDailyDate('nope')).toBeNull();
    expect(formatDailyDate(undefined)).toBeNull();
  });
});

describe('isStaleDaily', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  it('is false only for today’s UTC date', () => {
    expect(isStaleDaily('2026-10-05', now)).toBe(false);
    expect(isStaleDaily('2026-10-04', now)).toBe(true);
    expect(isStaleDaily(undefined, now)).toBe(true);
  });
});
