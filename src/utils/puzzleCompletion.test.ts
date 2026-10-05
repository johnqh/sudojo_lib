/**
 * Tests for applyPuzzleCompletion (the markCompleted reducer) and
 * getPracticeFetchStatus / getErrorHttpStatus.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS } from '../types/progress';
import { applyPuzzleCompletion } from './progress';
import { getErrorHttpStatus, getPracticeFetchStatus } from './gameFetchStatus';
import { isRealUser } from './auth';

const NOW = new Date('2026-10-05T12:00:00Z');

describe('applyPuzzleCompletion', () => {
  it('records a daily with streak, total and stats', () => {
    const next = applyPuzzleCompletion(
      DEFAULT_PROGRESS,
      { type: 'daily', id: '2026-10-05', timeSeconds: 300 },
      NOW
    );
    expect(next.completedPuzzles).toEqual([
      {
        type: 'daily',
        id: '2026-10-05',
        timeSeconds: 300,
        completedAt: NOW.toISOString(),
      },
    ]);
    expect(next.lastDailyDate).toBe('2026-10-05');
    expect(next.totalCompleted).toBe(1);
    expect(next.stats.bestDailyTime).toBe(300);
    expect(next.dailyStreak).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PROGRESS.completedPuzzles).toEqual([]);
  });

  it('keeps lastDailyDate for a level and ignores a repeat', () => {
    const once = applyPuzzleCompletion(
      { ...DEFAULT_PROGRESS, lastDailyDate: '2026-10-01' },
      { type: 'level', id: '3', timeSeconds: 100 },
      NOW
    );
    expect(once.lastDailyDate).toBe('2026-10-01');
    expect(once.stats.bestLevelTime).toBe(100);
    const twice = applyPuzzleCompletion(
      once,
      { type: 'level', id: '3', timeSeconds: 50 },
      NOW
    );
    expect(twice).toBe(once);
  });
});

describe('getPracticeFetchStatus', () => {
  it('maps HTTP statuses (402 only for subscriptions, as both apps)', () => {
    const err = (status: number) => Object.assign(new Error('x'), { status });
    const status = (error: unknown) =>
      getPracticeFetchStatus({ isLoading: false, response: null, error });
    expect(status(err(401))).toBe('auth_required');
    expect(status(err(402))).toBe('subscription_required');
    expect(status(err(403))).toBe('error');
    expect(status(new Error('HTTP 402'))).toBe('subscription_required');
    expect(status(new Error('boom'))).toBe('error');
  });

  it('reads the response', () => {
    const status = (
      response: Parameters<typeof getPracticeFetchStatus>[0]['response']
    ) => getPracticeFetchStatus({ isLoading: false, response, error: null });
    expect(status(undefined)).toBe('loading');
    expect(status({ success: true, data: {} })).toBe('ready');
    expect(status({ success: true })).toBe('no_practices');
    expect(status({ success: false, error: 'No practices found' })).toBe(
      'no_practices'
    );
    expect(status({ success: false, error: 'x' })).toBe('error');
    expect(
      getPracticeFetchStatus({ isLoading: true, response: null, error: 'x' })
    ).toBe('loading');
  });

  it('getErrorHttpStatus reads a numeric status only', () => {
    expect(getErrorHttpStatus({ status: 404 })).toBe(404);
    expect(getErrorHttpStatus({ status: '404' })).toBeUndefined();
    expect(getErrorHttpStatus(null)).toBeUndefined();
  });
});

describe('isRealUser', () => {
  it('is !!user && !user.isAnonymous', () => {
    expect(isRealUser(null)).toBe(false);
    expect(isRealUser({ isAnonymous: true })).toBe(false);
    expect(isRealUser({ isAnonymous: false })).toBe(true);
  });
});
