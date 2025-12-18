/**
 * Progress tracking types and domain models
 */

/** Record of a completed puzzle */
export interface CompletedPuzzle {
  /** Puzzle identifier */
  id: string;
  /** Type of puzzle */
  type: 'daily' | 'level';
  /** Completion timestamp */
  completedAt: string;
  /** Time to complete in seconds (optional) */
  timeSeconds?: number;
}

/** Game statistics */
export interface GameStats {
  /** Best time in seconds for daily puzzles */
  bestDailyTime: number | null;
  /** Best time in seconds for level puzzles */
  bestLevelTime: number | null;
  /** Average time in seconds */
  averageTime: number | null;
  /** Total time played in seconds */
  totalTimePlayed: number;
}

/** User progress data */
export interface UserProgress {
  /** List of completed puzzles */
  completedPuzzles: CompletedPuzzle[];
  /** Current daily streak */
  dailyStreak: number;
  /** Last daily completion date (YYYY-MM-DD) */
  lastDailyDate: string | null;
  /** Total puzzles completed */
  totalCompleted: number;
  /** Game statistics */
  stats: GameStats;
}

/** Default progress state */
export const DEFAULT_PROGRESS: UserProgress = {
  completedPuzzles: [],
  dailyStreak: 0,
  lastDailyDate: null,
  totalCompleted: 0,
  stats: {
    bestDailyTime: null,
    bestLevelTime: null,
    averageTime: null,
    totalTimePlayed: 0,
  },
};

/** Storage key for progress data */
export const PROGRESS_STORAGE_KEY = 'sudojo-progress';
