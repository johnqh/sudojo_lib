/**
 * Tests for time formatting utilities
 */

import { describe, expect, it } from 'vitest';
import { formatTime, parseTime } from './time';

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds only (< 1 minute)', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(599)).toBe('9:59');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3665)).toBe('1:01:05');
    expect(formatTime(7200)).toBe('2:00:00');
    expect(formatTime(86399)).toBe('23:59:59');
  });

  it('pads minutes and seconds with leading zeros when needed', () => {
    expect(formatTime(3601)).toBe('1:00:01');
    expect(formatTime(3661)).toBe('1:01:01');
  });
});

describe('parseTime', () => {
  it('parses MM:SS format', () => {
    expect(parseTime('0:00')).toBe(0);
    expect(parseTime('1:05')).toBe(65);
    expect(parseTime('59:59')).toBe(3599);
  });

  it('parses HH:MM:SS format', () => {
    expect(parseTime('1:00:00')).toBe(3600);
    expect(parseTime('1:01:05')).toBe(3665);
    expect(parseTime('2:00:00')).toBe(7200);
  });

  it('returns 0 for invalid format', () => {
    expect(parseTime('')).toBe(0);
    expect(parseTime('123')).toBe(0);
  });

  it('round-trips with formatTime', () => {
    const testValues = [0, 5, 65, 3600, 3665, 86399];
    for (const seconds of testValues) {
      expect(parseTime(formatTime(seconds))).toBe(seconds);
    }
  });
});
