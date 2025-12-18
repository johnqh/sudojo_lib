/**
 * Game persistence types for saving/loading game state
 */

/** Saved game state */
export interface SavedGameState {
  /** User input string (81 chars, 0 = empty) */
  inputString: string;
  /** Pencilmarks string (comma-separated per cell) */
  pencilmarksString: string;
  /** Whether pencil mode was active */
  isPencilMode: boolean;
  /** Last saved timestamp */
  savedAt: string;
}

/** Key for identifying a game to persist */
export interface GamePersistenceKey {
  /** Type of puzzle */
  type: 'daily' | 'level';
  /** Unique identifier (date for daily, levelId for level) */
  id: string;
}

/** Storage key prefix for game persistence */
export const GAME_STORAGE_PREFIX = 'sudojo_game_';

/**
 * Generate storage key for a game
 *
 * @param key - Game persistence key
 * @returns Storage key string
 */
export function getGameStorageKey(key: GamePersistenceKey): string {
  return `${GAME_STORAGE_PREFIX}${key.type}_${key.id}`;
}
