/**
 * Tests for digit display utilities
 */

import { describe, expect, it } from 'vitest';
import { displayDigit } from './digitDisplay';

describe('displayDigit', () => {
  describe('numeric format (default)', () => {
    it('returns string representation of digits 1-9', () => {
      for (let d = 1; d <= 9; d++) {
        expect(displayDigit(d)).toBe(String(d));
        expect(displayDigit(d, 'numeric')).toBe(String(d));
      }
    });
  });

  describe('kanji format', () => {
    const expectedKanji = [
      '一',
      '二',
      '三',
      '四',
      '五',
      '六',
      '七',
      '八',
      '九',
    ];

    it('returns kanji characters for digits 1-9', () => {
      for (let d = 1; d <= 9; d++) {
        expect(displayDigit(d, 'kanji')).toBe(expectedKanji[d - 1]);
      }
    });
  });

  describe('emojis format', () => {
    const expectedEmojis = [
      '🍎',
      '🍊',
      '🍋',
      '🍏',
      '🫐',
      '🍇',
      '🍑',
      '🌽',
      '🍓',
    ];

    it('returns emoji characters for digits 1-9', () => {
      for (let d = 1; d <= 9; d++) {
        expect(displayDigit(d, 'emojis')).toBe(expectedEmojis[d - 1]);
      }
    });
  });

  describe('out-of-range digits', () => {
    it('returns string representation for digit 0', () => {
      expect(displayDigit(0)).toBe('0');
      expect(displayDigit(0, 'kanji')).toBe('0');
      expect(displayDigit(0, 'emojis')).toBe('0');
    });

    it('returns string representation for digit 10', () => {
      expect(displayDigit(10)).toBe('10');
      expect(displayDigit(10, 'kanji')).toBe('10');
      expect(displayDigit(10, 'emojis')).toBe('10');
    });

    it('returns string representation for negative digits', () => {
      expect(displayDigit(-1)).toBe('-1');
      expect(displayDigit(-1, 'kanji')).toBe('-1');
    });
  });
});
