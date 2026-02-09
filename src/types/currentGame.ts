/**
 * Types for the current game feature
 */

/** Source of the current game */
export type GameSource = 'daily' | 'level' | 'entered';

/** Which store slot a game lives in */
export type GameSlot = 'daily' | 'play';

/** Metadata for navigation back to the game */
export interface CurrentGameMeta {
  /** For daily games - the date string (YYYY-MM-DD) */
  dailyDate?: string;
  /** For level games - the level UUID */
  levelId?: string;
  /** Level title for display */
  levelTitle?: string;
}

/** Current game state stored in Zustand */
export interface CurrentGame {
  /** Game source type */
  source: GameSource;
  /** Original puzzle string (81 chars) */
  puzzle: string;
  /** Solution string (81 chars) */
  solution: string;
  /** Navigation metadata */
  meta: CurrentGameMeta;
  /** User's current input (81 chars, '0' = empty) */
  inputString: string;
  /** User's pencilmarks (comma-separated format) */
  pencilmarksString: string;
  /** Whether pencil mode was active */
  isPencilMode: boolean;
  /** Elapsed time in seconds */
  elapsedTime: number;
  /** When the game was started (ISO string) */
  startedAt: string;
  /** When last updated (ISO string) */
  updatedAt: string;
}
