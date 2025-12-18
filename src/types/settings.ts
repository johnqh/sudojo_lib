/**
 * App settings types and domain models
 */

/** Display format for Sudoku digits */
export type DigitDisplay = 'numeric' | 'kanji' | 'emojis';

/** Application settings */
export interface AppSettings {
  /** Show errors when input doesn't match solution */
  showErrors: boolean;
  /** Generate symmetrical puzzles */
  symmetrical: boolean;
  /** Digit display format */
  display: DigitDisplay;
}

/** Default application settings */
export const DEFAULT_SETTINGS: AppSettings = {
  showErrors: true,
  symmetrical: true,
  display: 'numeric',
};

/** Storage key for settings */
export const SETTINGS_STORAGE_KEY = 'sudojo-settings';
