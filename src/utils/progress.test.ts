/**
 * Tests for progress calculation utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompletedPuzzle } from '../types/progress';
import {
  calculateStats,
  calculateStreak,
  getCompletedDailyDates,
  getCompletedLevelIds,
  isPuzzleCompleted,
} from './progress';

describe('calculateStats', () => {
  it('returns empty stats for no puzzles', () => {
    const stats = calculateStats([]);
    expect(stats.bestDailyTime).toBeNull();
    expect(stats.bestLevelTime).toBeNull();
    expect(stats.averageTime).toBeNull();
    expect(stats.totalTimePlayed).toBe(0);
  });

  it('calculates stats for daily puzzles', () => {
    const puzzles: CompletedPuzzle[] = [
      {
        id: '2024-01-01',
        type: 'daily',
        completedAt: '2024-01-01',
        timeSeconds: 120,
      },
      {
        id: '2024-01-02',
        type: 'daily',
        completedAt: '2024-01-02',
        timeSeconds: 90,
      },
      {
        id: '2024-01-03',
        type: 'daily',
        completedAt: '2024-01-03',
        timeSeconds: 150,
      },
    ];

    const stats = calculateStats(puzzles);
    expect(stats.bestDailyTime).toBe(90);
    expect(stats.bestLevelTime).toBeNull();
    expect(stats.averageTime).toBe(120); // (120 + 90 + 150) / 3
    expect(stats.totalTimePlayed).toBe(360);
  });

  it('calculates stats for level puzzles', () => {
    const puzzles: CompletedPuzzle[] = [
      {
        id: 'level-1',
        type: 'level',
        completedAt: '2024-01-01',
        timeSeconds: 200,
      },
      {
        id: 'level-2',
        type: 'level',
        completedAt: '2024-01-02',
        timeSeconds: 100,
      },
    ];

    const stats = calculateStats(puzzles);
    expect(stats.bestDailyTime).toBeNull();
    expect(stats.bestLevelTime).toBe(100);
    expect(stats.averageTime).toBe(150);
    expect(stats.totalTimePlayed).toBe(300);
  });

  it('calculates stats for mixed puzzle types', () => {
    const puzzles: CompletedPuzzle[] = [
      {
        id: '2024-01-01',
        type: 'daily',
        completedAt: '2024-01-01',
        timeSeconds: 120,
      },
      {
        id: 'level-1',
        type: 'level',
        completedAt: '2024-01-01',
        timeSeconds: 80,
      },
    ];

    const stats = calculateStats(puzzles);
    expect(stats.bestDailyTime).toBe(120);
    expect(stats.bestLevelTime).toBe(80);
    expect(stats.averageTime).toBe(100);
    expect(stats.totalTimePlayed).toBe(200);
  });

  it('includes newTime in calculations', () => {
    const puzzles: CompletedPuzzle[] = [
      {
        id: '2024-01-01',
        type: 'daily',
        completedAt: '2024-01-01',
        timeSeconds: 100,
      },
    ];

    const stats = calculateStats(puzzles, 200);
    expect(stats.averageTime).toBe(150); // (100 + 200) / 2
    expect(stats.totalTimePlayed).toBe(300);
  });

  it('handles puzzles without timeSeconds', () => {
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-01', type: 'daily', completedAt: '2024-01-01' },
      {
        id: '2024-01-02',
        type: 'daily',
        completedAt: '2024-01-02',
        timeSeconds: 120,
      },
    ];

    const stats = calculateStats(puzzles);
    expect(stats.averageTime).toBe(120); // only 1 puzzle with time
    expect(stats.totalTimePlayed).toBe(120);
  });
});

describe('calculateStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when no last daily date', () => {
    expect(calculateStreak([], null)).toBe(0);
  });

  it('returns 0 when streak is broken (last daily more than 1 day ago)', () => {
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-05', type: 'daily', completedAt: '2024-01-05' },
    ];

    expect(calculateStreak(puzzles, '2024-01-05')).toBe(0);
  });

  it('counts streak of 1 for today only', () => {
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-10', type: 'daily', completedAt: '2024-01-10' },
    ];

    expect(calculateStreak(puzzles, '2024-01-10')).toBe(1);
  });

  it('counts streak for consecutive days', () => {
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-08', type: 'daily', completedAt: '2024-01-08' },
      { id: '2024-01-09', type: 'daily', completedAt: '2024-01-09' },
      { id: '2024-01-10', type: 'daily', completedAt: '2024-01-10' },
    ];

    expect(calculateStreak(puzzles, '2024-01-10')).toBe(3);
  });

  it('counts streak from yesterday if not completed today yet', () => {
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-08', type: 'daily', completedAt: '2024-01-08' },
      { id: '2024-01-09', type: 'daily', completedAt: '2024-01-09' },
    ];

    expect(calculateStreak(puzzles, '2024-01-09')).toBe(2);
  });

  it('ignores level puzzles in streak calculation', () => {
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-10', type: 'daily', completedAt: '2024-01-10' },
      { id: 'level-1', type: 'level', completedAt: '2024-01-10' },
    ];

    expect(calculateStreak(puzzles, '2024-01-10')).toBe(1);
  });
});

describe('isPuzzleCompleted', () => {
  const puzzles: CompletedPuzzle[] = [
    { id: '2024-01-01', type: 'daily', completedAt: '2024-01-01' },
    { id: 'level-1', type: 'level', completedAt: '2024-01-01' },
    { id: 'level-2', type: 'level', completedAt: '2024-01-02' },
  ];

  it('returns true for completed daily puzzle', () => {
    expect(isPuzzleCompleted(puzzles, 'daily', '2024-01-01')).toBe(true);
  });

  it('returns true for completed level puzzle', () => {
    expect(isPuzzleCompleted(puzzles, 'level', 'level-1')).toBe(true);
    expect(isPuzzleCompleted(puzzles, 'level', 'level-2')).toBe(true);
  });

  it('returns false for non-completed puzzle', () => {
    expect(isPuzzleCompleted(puzzles, 'daily', '2024-01-02')).toBe(false);
    expect(isPuzzleCompleted(puzzles, 'level', 'level-3')).toBe(false);
  });

  it('returns false for wrong type', () => {
    expect(isPuzzleCompleted(puzzles, 'level', '2024-01-01')).toBe(false);
    expect(isPuzzleCompleted(puzzles, 'daily', 'level-1')).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isPuzzleCompleted([], 'daily', '2024-01-01')).toBe(false);
  });
});

describe('getCompletedLevelIds', () => {
  it('returns empty array for no puzzles', () => {
    expect(getCompletedLevelIds([])).toEqual([]);
  });

  it('returns only level IDs', () => {
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-01', type: 'daily', completedAt: '2024-01-01' },
      { id: 'level-1', type: 'level', completedAt: '2024-01-01' },
      { id: 'level-2', type: 'level', completedAt: '2024-01-02' },
    ];

    expect(getCompletedLevelIds(puzzles)).toEqual(['level-1', 'level-2']);
  });
});

describe('getCompletedDailyDates', () => {
  it('returns empty array for no puzzles', () => {
    expect(getCompletedDailyDates([])).toEqual([]);
  });

  it('returns only daily dates', () => {
    const puzzles: CompletedPuzzle[] = [
      { id: '2024-01-01', type: 'daily', completedAt: '2024-01-01' },
      { id: '2024-01-02', type: 'daily', completedAt: '2024-01-02' },
      { id: 'level-1', type: 'level', completedAt: '2024-01-01' },
    ];

    expect(getCompletedDailyDates(puzzles)).toEqual([
      '2024-01-01',
      '2024-01-02',
    ]);
  });
});
