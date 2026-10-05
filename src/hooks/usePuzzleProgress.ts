/**
 * Hook for the player's puzzle progress (completed puzzles, streak, stats),
 * persisted in localStorage under PROGRESS_STORAGE_KEY.
 *
 * The web ProgressProvider's logic. RN does not track progress today; where
 * it shims localStorage (as it does for the game store) the hook works there
 * too.
 */

import { useCallback, useMemo } from 'react';
import type { UserProgress } from '../types/progress';
import { DEFAULT_PROGRESS, PROGRESS_STORAGE_KEY } from '../types/progress';
import {
  applyPuzzleCompletion,
  getCompletedDailyDates,
  getCompletedLevelIds,
  isPuzzleCompleted,
  type PuzzleCompletion,
} from '../utils/progress';
import { useLocalStorage } from './useLocalStorage';

export interface UsePuzzleProgressOptions {
  /** localStorage key (default PROGRESS_STORAGE_KEY, 'sudojo-progress') */
  storageKey?: string;
}

export interface UsePuzzleProgressResult {
  /** The stored progress */
  progress: UserProgress;
  /** Record a completion (no-op when the puzzle is already completed) */
  markCompleted: (puzzle: PuzzleCompletion) => void;
  /** Whether a puzzle has been completed */
  isCompleted: (type: 'daily' | 'level', id: string) => boolean;
  /** Ids of completed level puzzles */
  getCompletedLevelIds: () => string[];
  /** Dates (YYYY-MM-DD) of completed dailies */
  getCompletedDailyDates: () => string[];
  /** Reset to DEFAULT_PROGRESS */
  resetProgress: () => void;
}

/**
 * @example
 * ```tsx
 * const { markCompleted, isCompleted } = usePuzzleProgress();
 * markCompleted({ type: 'daily', id: '2026-10-05', timeSeconds: 312 });
 * ```
 */
export function usePuzzleProgress(
  options: UsePuzzleProgressOptions = {}
): UsePuzzleProgressResult {
  const { storageKey = PROGRESS_STORAGE_KEY } = options;
  const [progress, setProgress] = useLocalStorage<UserProgress>(
    storageKey,
    DEFAULT_PROGRESS
  );

  const markCompleted = useCallback(
    (puzzle: PuzzleCompletion) => {
      setProgress(prev => applyPuzzleCompletion(prev, puzzle));
    },
    [setProgress]
  );

  const isCompleted = useCallback(
    (type: 'daily' | 'level', id: string) =>
      isPuzzleCompleted(progress.completedPuzzles, type, id),
    [progress.completedPuzzles]
  );

  const getLevelIds = useCallback(
    () => getCompletedLevelIds(progress.completedPuzzles),
    [progress.completedPuzzles]
  );

  const getDailyDates = useCallback(
    () => getCompletedDailyDates(progress.completedPuzzles),
    [progress.completedPuzzles]
  );

  const resetProgress = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
  }, [setProgress]);

  return useMemo(
    () => ({
      progress,
      markCompleted,
      isCompleted,
      getCompletedLevelIds: getLevelIds,
      getCompletedDailyDates: getDailyDates,
      resetProgress,
    }),
    [
      progress,
      markCompleted,
      isCompleted,
      getLevelIds,
      getDailyDates,
      resetProgress,
    ]
  );
}
