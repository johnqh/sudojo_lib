/**
 * Tests for entered-puzzle save/resume (useEnteredGameSession) and
 * getResumeGame with source 'entered'.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useGamePlayStore } from '../stores/gamePlayStore';
import type { CurrentGame } from '../types/currentGame';
import { getResumeGame } from './useResumeGame';
import {
  useEnteredGameSession,
  type UseEnteredGameSessionOptions,
} from './useEnteredGameSession';

const PUZZLE = `${'1'.repeat(20)}${'0'.repeat(61)}`;
const SOLUTION = '1'.repeat(81);

function entered(over: Partial<CurrentGame> = {}): CurrentGame {
  return {
    source: 'entered',
    puzzle: PUZZLE,
    solution: SOLUTION,
    meta: { level: 6, difficultyScore: 120 },
    inputString: `0${'5'.repeat(80)}`,
    pencilmarksString: '',
    isPencilMode: false,
    autoPencilmarks: false,
    elapsedTime: 77,
    startedAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    ...over,
  };
}

function render(initial: UseEnteredGameSessionOptions) {
  return renderHook(
    (props: UseEnteredGameSessionOptions) => useEnteredGameSession(props),
    { initialProps: initial }
  );
}

describe('getResumeGame (entered)', () => {
  it('needs only the source and 81-char strings', () => {
    expect(getResumeGame(entered(), { source: 'entered' })).not.toBeNull();
    expect(
      getResumeGame(entered({ solution: 'x' }), { source: 'entered' })
    ).toBeNull();
    expect(
      getResumeGame(entered({ source: 'level' }), { source: 'entered' })
    ).toBeNull();
  });
});

describe('useEnteredGameSession', () => {
  beforeEach(() => {
    useGamePlayStore.setState({ dailyGame: null, playGame: null });
  });

  it('is idle while entering', () => {
    const { result } = render({ validatedPuzzle: null });
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.gameProps).toBeNull();
  });

  it('resumes a saved entered game with its state and saved level', () => {
    useGamePlayStore.setState({ playGame: entered() });
    const { result } = render({ validatedPuzzle: null });
    expect(result.current.isResuming).toBe(true);
    expect(result.current.activePuzzle).toEqual({
      puzzle: PUZZLE,
      solution: SOLUTION,
      level: 6,
      difficultyScore: 120,
    });
    expect(result.current.gameProps).toEqual({
      puzzle: PUZZLE,
      solution: SOLUTION,
      scramble: false,
      initialInput: `0${'5'.repeat(80)}`,
      initialPencilmarks: '',
      initialElapsedTime: 77,
      initialAutoPencilmarks: false,
    });
    act(() => result.current.onBoardReady(PUZZLE, SOLUTION));
    expect(useGamePlayStore.getState().playGame?.elapsedTime).toBe(77);
  });

  it('saves a validated puzzle once with level meta and entry pencilmarks', async () => {
    const pencilmarks = `12${','.repeat(80)}`;
    const { result, rerender } = render({ validatedPuzzle: null });
    const props: UseEnteredGameSessionOptions = {
      validatedPuzzle: {
        puzzle: PUZZLE,
        solution: SOLUTION,
        level: 3,
        difficultyScore: 40,
      },
      initialPlayState: {
        input: '0'.repeat(81),
        pencilmarks,
        autopencil: true,
      },
    };
    rerender(props);
    expect(result.current.isResuming).toBe(false);
    expect(result.current.gameProps).toEqual({
      puzzle: PUZZLE,
      solution: SOLUTION,
      scramble: false,
      initialInput: '0'.repeat(81),
      initialPencilmarks: pencilmarks,
      initialAutoPencilmarks: true,
    });
    act(() =>
      result.current.onScrambledReady({ puzzle: PUZZLE, solution: SOLUTION })
    );
    await waitFor(() =>
      expect(useGamePlayStore.getState().playGame).not.toBeNull()
    );
    const saved = useGamePlayStore.getState().playGame;
    expect(saved?.source).toBe('entered');
    expect(saved?.meta).toEqual({ level: 3, difficultyScore: 40 });
    expect(saved?.pencilmarksString).toBe(pencilmarks);
    expect(saved?.autoPencilmarks).toBe(true);
    // Saving does not flip into resuming
    expect(result.current.isResuming).toBe(false);

    act(() => result.current.onComplete());
    expect(useGamePlayStore.getState().playGame).toBeNull();
  });

  it('newGame clears the save, stops resuming and resets entry', () => {
    useGamePlayStore.setState({ playGame: entered() });
    const onReset = vi.fn();
    const { result } = render({ validatedPuzzle: null, onReset });
    expect(result.current.isResuming).toBe(true);
    act(() => result.current.newGame());
    expect(useGamePlayStore.getState().playGame).toBeNull();
    expect(result.current.isResuming).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
