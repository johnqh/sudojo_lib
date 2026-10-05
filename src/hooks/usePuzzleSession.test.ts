/**
 * Tests for useResumeGame / getResumeGame and usePuzzleSession.
 * Server gamification (useSudojoPlayStart / useSudojoPlayFinish) is mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { NetworkClient } from '@sudobility/types';

const m = vi.hoisted(() => ({ start: vi.fn(), finish: vi.fn() }));

vi.mock('@sudobility/sudojo_client', () => ({
  useSudojoPlayStart: () => ({ mutateAsync: m.start }),
  useSudojoPlayFinish: () => ({ mutateAsync: m.finish }),
}));

import { useGamePlayStore } from '../stores/gamePlayStore';
import type { CurrentGame } from '../types/currentGame';
import { getUtcDateString } from '../utils/date';
import { getResumeGame, useResumeGame } from './useResumeGame';
import {
  type SessionPuzzleInput,
  usePuzzleSession,
  type UsePuzzleSessionOptions,
} from './usePuzzleSession';

const PUZZLE = `${'1'.repeat(20)}${'0'.repeat(61)}`;
const SOLUTION = '1'.repeat(81);
const SCRAMBLED = `${'2'.repeat(20)}${'0'.repeat(61)}`;
const SCRAMBLED_SOLUTION = '2'.repeat(81);
const TODAY = getUtcDateString();
const api = { networkClient: {} as NetworkClient, baseUrl: 'https://api' };
const realUser = { uid: 'u1', isAnonymous: false };

function savedGame(over: Partial<CurrentGame>): CurrentGame {
  return {
    source: 'daily',
    puzzle: SCRAMBLED,
    solution: SCRAMBLED_SOLUTION,
    meta: {},
    inputString: `3${'0'.repeat(80)}`,
    pencilmarksString: '',
    isPencilMode: false,
    autoPencilmarks: true,
    elapsedTime: 42,
    startedAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    ...over,
  };
}

const daily: SessionPuzzleInput = {
  uuid: 'daily-uuid',
  board: PUZZLE,
  solution: SOLUTION,
  level: 4,
  techniques: 6,
  techniques_bitmask: '6',
  difficulty_score: 30,
  date: TODAY,
};

function renderSession(options: Partial<UsePuzzleSessionOptions>) {
  return renderHook(
    (props: Partial<UsePuzzleSessionOptions>) =>
      usePuzzleSession({
        ...api,
        token: 'tok',
        user: realUser,
        source: 'daily',
        puzzle: null,
        ...options,
        ...props,
      } as UsePuzzleSessionOptions),
    { initialProps: {} }
  );
}

describe('getResumeGame', () => {
  it('checks source, 81-char strings, daily date and level id', () => {
    const now = new Date(`${TODAY}T12:00:00Z`);
    const daily = savedGame({ meta: { dailyDate: TODAY } });
    expect(getResumeGame(daily, { source: 'daily', now })).toBe(daily);
    expect(
      getResumeGame(savedGame({ meta: { dailyDate: '2020-01-01' } }), {
        source: 'daily',
        now,
      })
    ).toBeNull();
    expect(
      getResumeGame(savedGame({ meta: { dailyDate: '2020-01-01' } }), {
        source: 'daily',
        allowStaleDaily: true,
        now,
      })
    ).not.toBeNull();
    expect(
      getResumeGame(savedGame({ meta: {}, puzzle: 'short' }), {
        source: 'daily',
      })
    ).toBeNull();
    const level = savedGame({ source: 'level', meta: { levelId: '3' } });
    expect(getResumeGame(level, { source: 'level', levelNumber: 3 })).toBe(
      level
    );
    expect(
      getResumeGame(level, { source: 'level', levelNumber: 4 })
    ).toBeNull();
    expect(getResumeGame(level, { source: 'daily' })).toBeNull();
  });
});

describe('useResumeGame', () => {
  beforeEach(() => {
    useGamePlayStore.setState({ dailyGame: null, playGame: null });
  });

  it('snapshots today’s daily and clears a stale one', async () => {
    const today = savedGame({ meta: { dailyDate: TODAY } });
    useGamePlayStore.setState({ dailyGame: today });
    const { result } = renderHook(() => useResumeGame({ source: 'daily' }));
    expect(result.current.isReady).toBe(true);
    expect(result.current.resumeGame).toBe(today);

    // A later write to the slot does not change the snapshot
    act(() => {
      useGamePlayStore.setState({ dailyGame: null });
    });
    expect(result.current.resumeGame).toBe(today);
    act(() => result.current.discard());
    expect(result.current.resumeGame).toBeNull();

    useGamePlayStore.setState({
      dailyGame: savedGame({ meta: { dailyDate: '2020-01-01' } }),
    });
    const stale = renderHook(() => useResumeGame({ source: 'daily' }));
    expect(stale.result.current.resumeGame).toBeNull();
    await waitFor(() => {
      expect(useGamePlayStore.getState().dailyGame).toBeNull();
    });
  });

  it('waits for isStoreHydrated', () => {
    const { result, rerender } = renderHook(
      ({ hydrated }: { hydrated: boolean }) =>
        useResumeGame({ source: 'daily', isStoreHydrated: hydrated }),
      { initialProps: { hydrated: false } }
    );
    expect(result.current.isReady).toBe(false);
    rerender({ hydrated: true });
    expect(result.current.isReady).toBe(true);
  });
});

describe('usePuzzleSession', () => {
  beforeEach(() => {
    useGamePlayStore.setState({ dailyGame: null, playGame: null });
    m.start.mockReset();
    m.finish.mockReset();
    m.start.mockResolvedValue({ success: true, data: { sessionId: 's1' } });
  });

  it('fresh daily: pins, saves the scrambled game once and starts the session', async () => {
    const { result } = renderSession({ puzzle: daily, fetchStatus: 'success' });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isResuming).toBe(false);
    expect(result.current.gameProps).toEqual({
      puzzle: PUZZLE,
      solution: SOLUTION,
      scramble: true,
    });
    expect(result.current.gameKey).toBe('daily-uuid');
    expect(result.current.puzzleId).toBe(TODAY);

    act(() =>
      result.current.onScrambledReady({
        puzzle: SCRAMBLED,
        solution: SCRAMBLED_SOLUTION,
      })
    );
    await waitFor(() => expect(m.start).toHaveBeenCalledTimes(1));
    const saved = useGamePlayStore.getState().dailyGame;
    expect(saved?.puzzle).toBe(SCRAMBLED);
    expect(saved?.solution).toBe(SCRAMBLED_SOLUTION);
    expect(saved?.meta).toEqual({
      boardUuid: 'daily-uuid',
      techniques: 6,
      techniques_bitmask: '6',
      dailyDate: TODAY,
      level: 4,
      difficultyScore: 30,
    });
    // The session gets the board as played, which is what hints send as
    // `original`; the API credits a hint only when the two match.
    expect(m.start).toHaveBeenCalledWith({
      token: 'tok',
      data: {
        board: SCRAMBLED,
        solution: SCRAMBLED_SOLUTION,
        level: 4,
        techniques: '6',
        puzzleType: 'daily',
        puzzleId: TODAY,
      },
    });

    // The game reporting again does not save or start twice
    act(() => result.current.onBoardReady(SCRAMBLED, SCRAMBLED_SOLUTION));
    expect(m.start).toHaveBeenCalledTimes(1);
    // ...and the fresh save does not flip the screen into resuming
    expect(result.current.isResuming).toBe(false);
  });

  it('does not start a session for an anonymous user or a completed daily', async () => {
    const { result } = renderSession({
      puzzle: daily,
      fetchStatus: 'success',
      user: { uid: 'anon', isAnonymous: true },
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    act(() =>
      result.current.onScrambledReady({
        puzzle: SCRAMBLED,
        solution: SCRAMBLED_SOLUTION,
      })
    );
    await waitFor(() =>
      expect(useGamePlayStore.getState().dailyGame).not.toBeNull()
    );
    expect(m.start).not.toHaveBeenCalled();

    useGamePlayStore.setState({ dailyGame: null });
    const done = renderSession({
      puzzle: daily,
      fetchStatus: 'success',
      isPuzzleCompleted: () => true,
    });
    await waitFor(() =>
      expect(done.result.current.alreadyCompleted).toBe(true)
    );
    act(() =>
      done.result.current.onScrambledReady({
        puzzle: SCRAMBLED,
        solution: SCRAMBLED_SOLUTION,
      })
    );
    expect(useGamePlayStore.getState().dailyGame).toBeNull();
    expect(m.start).not.toHaveBeenCalled();
  });

  it('resumes a saved level game without scrambling or a new session', async () => {
    useGamePlayStore.setState({
      playGame: savedGame({
        source: 'level',
        meta: { levelId: '3', boardUuid: 'b1', level: 3 },
      }),
    });
    const { result } = renderSession({ source: 'level', levelNumber: 3 });
    expect(result.current.isResuming).toBe(true);
    expect(result.current.status).toBe('success');
    expect(result.current.gameKey).toBe('b1');
    expect(result.current.gameProps).toEqual({
      puzzle: SCRAMBLED,
      solution: SCRAMBLED_SOLUTION,
      scramble: false,
      initialInput: `3${'0'.repeat(80)}`,
      initialPencilmarks: '',
      initialElapsedTime: 42,
      initialAutoPencilmarks: true,
    });
    act(() => result.current.onBoardReady(SCRAMBLED, SCRAMBLED_SOLUTION));
    expect(m.start).not.toHaveBeenCalled();
  });

  it('startSessionOnResume restarts the server session (RN daily)', async () => {
    useGamePlayStore.setState({
      dailyGame: savedGame({ meta: { dailyDate: TODAY, level: 5 } }),
    });
    renderSession({ startSessionOnResume: true });
    await waitFor(() => expect(m.start).toHaveBeenCalledTimes(1));
    expect(m.start.mock.calls[0]?.[0].data).toMatchObject({
      level: 5,
      puzzleType: 'daily',
      puzzleId: TODAY,
    });
  });

  it('completes: clears the save, finishes, shows achievements, records progress', async () => {
    m.finish.mockResolvedValue({
      success: true,
      data: { level: null, badges: [], points: { totalPoints: 80 } },
    });
    const onPuzzleCompleted = vi.fn();
    const { result } = renderSession({
      source: 'level',
      levelNumber: 3,
      puzzle: { ...daily, uuid: 'b9', date: null },
      fetchStatus: 'success',
      onPuzzleCompleted,
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    act(() => result.current.onBoardReady(SCRAMBLED, SCRAMBLED_SOLUTION));
    await waitFor(() =>
      expect(useGamePlayStore.getState().playGame?.meta.levelId).toBe('3')
    );

    await act(async () => {
      await result.current.onComplete(120);
    });
    expect(useGamePlayStore.getState().playGame).toBeNull();
    expect(m.finish).toHaveBeenCalledWith({
      token: 'tok',
      data: { elapsedTime: 120 },
    });
    expect(result.current.showAchievement).toBe(true);
    expect(result.current.achievementResult?.totalPointsEarned).toBe(80);
    expect(onPuzzleCompleted).toHaveBeenCalledWith({
      type: 'level',
      id: 'b9',
      timeSeconds: 120,
    });

    act(() => result.current.closeAchievement());
    expect(result.current.showAchievement).toBe(false);
    expect(result.current.achievementResult).toBeNull();
  });

  it('hides an empty achievement unless showEmptyAchievement', async () => {
    m.finish.mockResolvedValue({
      success: true,
      data: { level: null, badges: [], points: { totalPoints: 0 } },
    });
    const { result } = renderSession({ puzzle: daily, fetchStatus: 'success' });
    await waitFor(() => expect(result.current.status).toBe('success'));
    await act(async () => {
      await result.current.onComplete(10);
    });
    expect(result.current.showAchievement).toBe(false);

    const rn = renderSession({
      puzzle: daily,
      fetchStatus: 'success',
      showEmptyAchievement: true,
    });
    await waitFor(() => expect(rn.result.current.status).toBe('success'));
    await act(async () => {
      await rn.result.current.onComplete(10);
    });
    expect(rn.result.current.showAchievement).toBe(true);
  });

  it('newGame unpins and does not re-pin the same board', async () => {
    const board = { ...daily, uuid: 'old', date: null };
    const { result, rerender } = renderSession({
      source: 'level',
      levelNumber: 2,
      puzzle: board,
      fetchStatus: 'success',
    });
    await waitFor(() => expect(result.current.gameKey).toBe('old'));
    act(() => result.current.newGame());
    rerender({});
    expect(result.current.gameKey).toBeNull();
    expect(result.current.status).toBe('loading'); // waiting for another board

    rerender({ puzzle: { ...board, uuid: 'new' } });
    await waitFor(() => expect(result.current.gameKey).toBe('new'));
  });

  it('passes the fetch status through until a puzzle is pinned', () => {
    const { result } = renderSession({ fetchStatus: 'auth_required' });
    expect(result.current.status).toBe('auth_required');
    expect(result.current.gameProps).toBeNull();
  });
});
