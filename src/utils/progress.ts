/**
 * Progress calculation utilities
 */

import type { CompletedPuzzle, GameStats } from '../types/progress';

/**
 * Calculate game statistics from completed puzzles
 *
 * @param completedPuzzles - Array of completed puzzle records
 * @param newTime - Optional new time to include in calculations
 * @returns Computed game statistics
 */
export function calculateStats(
  completedPuzzles: CompletedPuzzle[],
  newTime?: number
): GameStats {
  const puzzlesWithTime = completedPuzzles.filter(
    p => p.timeSeconds !== undefined
  );

  // Calculate total time
  const totalTimePlayed =
    puzzlesWithTime.reduce((sum, p) => sum + (p.timeSeconds ?? 0), 0) +
    (newTime ?? 0);

  // Calculate average time
  const count = puzzlesWithTime.length + (newTime !== undefined ? 1 : 0);
  const averageTime = count > 0 ? Math.round(totalTimePlayed / count) : null;

  // Calculate best times by type
  const dailyTimes = completedPuzzles
    .filter(
      (p): p is CompletedPuzzle & { timeSeconds: number } =>
        p.type === 'daily' && p.timeSeconds !== undefined
    )
    .map(p => p.timeSeconds);
  const levelTimes = completedPuzzles
    .filter(
      (p): p is CompletedPuzzle & { timeSeconds: number } =>
        p.type === 'level' && p.timeSeconds !== undefined
    )
    .map(p => p.timeSeconds);

  const bestDailyTime = dailyTimes.length > 0 ? Math.min(...dailyTimes) : null;
  const bestLevelTime = levelTimes.length > 0 ? Math.min(...levelTimes) : null;

  return {
    bestDailyTime,
    bestLevelTime,
    averageTime,
    totalTimePlayed,
  };
}

/**
 * Calculate daily streak based on completions
 *
 * @param completedPuzzles - Array of completed puzzle records
 * @param lastDailyDate - Date of last daily completion (YYYY-MM-DD)
 * @returns Current streak count
 */
export function calculateStreak(
  completedPuzzles: CompletedPuzzle[],
  lastDailyDate: string | null
): number {
  if (!lastDailyDate) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // If last daily wasn't today or yesterday, streak is broken
  if (lastDailyDate !== today && lastDailyDate !== yesterday) {
    return 0;
  }

  // Count consecutive days
  const dailyDates = completedPuzzles
    .filter(p => p.type === 'daily')
    .map(p => p.id)
    .sort()
    .reverse();

  let streak = 0;
  let currentDate: string | undefined =
    lastDailyDate === today ? today : yesterday;

  for (const date of dailyDates) {
    if (currentDate === undefined) break;
    if (date === currentDate) {
      streak++;
      // Go back one day
      const previousDay: Date = new Date(currentDate);
      previousDay.setDate(previousDay.getDate() - 1);
      currentDate = previousDay.toISOString().split('T')[0];
    } else if (date < currentDate) {
      break;
    }
  }

  return streak;
}

/**
 * Check if a specific puzzle is completed
 *
 * @param completedPuzzles - Array of completed puzzle records
 * @param type - Puzzle type to check
 * @param id - Puzzle ID to check
 * @returns Whether the puzzle is completed
 */
export function isPuzzleCompleted(
  completedPuzzles: CompletedPuzzle[],
  type: 'daily' | 'level',
  id: string
): boolean {
  return completedPuzzles.some(p => p.type === type && p.id === id);
}

/**
 * Get completed level IDs
 *
 * @param completedPuzzles - Array of completed puzzle records
 * @returns Array of completed level IDs
 */
export function getCompletedLevelIds(
  completedPuzzles: CompletedPuzzle[]
): string[] {
  return completedPuzzles.filter(p => p.type === 'level').map(p => p.id);
}

/**
 * Get completed daily dates
 *
 * @param completedPuzzles - Array of completed puzzle records
 * @returns Array of completed daily dates (YYYY-MM-DD)
 */
export function getCompletedDailyDates(
  completedPuzzles: CompletedPuzzle[]
): string[] {
  return completedPuzzles.filter(p => p.type === 'daily').map(p => p.id);
}
