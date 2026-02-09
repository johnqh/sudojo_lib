/**
 * Digit display mapping for different display formats.
 * Used by both sudojo_app (web) and sudojo_app_rn (React Native).
 */

import type { DigitDisplay } from '../types/settings';

const KANJI_DIGITS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
] as const;

const EMOJI_DIGITS = [
  '🍎',
  '🍊',
  '🍋',
  '🍏',
  '🫐',
  '🍇',
  '🍑',
  '🌽',
  '🍓',
] as const;

/**
 * Convert a digit (1-9) to its display string based on the display format.
 *
 * @param digit - A number 1-9
 * @param format - The display format ('numeric', 'kanji', or 'emojis')
 * @returns The display string for the digit
 */
export function displayDigit(
  digit: number,
  format: DigitDisplay = 'numeric'
): string {
  if (digit < 1 || digit > 9) return String(digit);

  switch (format) {
    case 'kanji':
      return KANJI_DIGITS[digit - 1] ?? String(digit);
    case 'emojis':
      return EMOJI_DIGITS[digit - 1] ?? String(digit);
    default:
      return String(digit);
  }
}
