/**
 * Hook for managing the current game
 *
 * Provides a clean API for starting, updating, and clearing the current game.
 * The `slot` option selects which independent store slot to use ('daily' or 'play'),
 * keeping the returned function signatures identical to before.
 *
 * @example
 * ```tsx
 * const { currentGame, startGame, updateProgress, clearGame } = useGamePlay({ slot: 'daily' });
 *
 * // Start a new game
 * startGame('daily', puzzle, solution, { dailyDate: '2024-01-15' });
 *
 * // Update progress (debounced)
 * updateProgress(inputString, pencilmarksString, isPencilMode, autoPencilmarks, elapsedTime);
 *
 * // Clear on completion
 * clearGame();
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import { useGamePlayStore } from '../stores/gamePlayStore';
import type {
  CurrentGame,
  CurrentGameMeta,
  GameSlot,
  GameSource,
} from '../types/currentGame';

export interface UseGamePlayOptions {
  /** Which game slot to use (default: 'play') */
  slot?: GameSlot;
  /** Debounce delay for auto-save in ms (default: 2000) */
  autoSaveDelay?: number;
}

export interface UseGamePlayResult {
  /** Current game state (null if none) */
  currentGame: CurrentGame | null;
  /** Whether there's an active game */
  hasCurrentGame: boolean;
  /** Start a new game */
  startGame: (
    source: GameSource,
    puzzle: string,
    solution: string,
    meta?: CurrentGameMeta
  ) => void;
  /** Update progress (debounced internally) */
  updateProgress: (
    inputString: string,
    pencilmarksString: string,
    isPencilMode: boolean,
    autoPencilmarks: boolean,
    elapsedTime: number
  ) => void;
  /** Clear current game (call on completion) */
  clearGame: () => void;
}

export function useGamePlay(
  options: UseGamePlayOptions = {}
): UseGamePlayResult {
  const { slot = 'play', autoSaveDelay = 2000 } = options;

  // Select the correct slot from the store
  const currentGame = useGamePlayStore(s =>
    slot === 'daily' ? s.dailyGame : s.playGame
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdate = useRef<
    [string, string, boolean, boolean, number] | null
  >(null);

  // Curry slot into startGame so callers keep the same signature
  const startGame = useCallback(
    (
      source: GameSource,
      puzzle: string,
      solution: string,
      meta?: CurrentGameMeta
    ) => {
      useGamePlayStore
        .getState()
        .startGame(slot, source, puzzle, solution, meta);
    },
    [slot]
  );

  // Curry slot into clearGame
  const clearGame = useCallback(() => {
    useGamePlayStore.getState().clearGame(slot);
  }, [slot]);

  // Throttled update — saves at most every autoSaveDelay ms.
  // Unlike debounce, throttle ensures periodic saves even when called
  // continuously (e.g. every second from the game timer).
  const updateProgress = useCallback(
    (
      inputString: string,
      pencilmarksString: string,
      isPencilMode: boolean,
      autoPencilmarks: boolean,
      elapsedTime: number
    ) => {
      pendingUpdate.current = [
        inputString,
        pencilmarksString,
        isPencilMode,
        autoPencilmarks,
        elapsedTime,
      ];

      // Only start a new timer if one isn't already running (throttle)
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingUpdate.current) {
            useGamePlayStore
              .getState()
              .updateProgress(slot, ...pendingUpdate.current);
            pendingUpdate.current = null;
          }
          timeoutRef.current = null;
        }, autoSaveDelay);
      }
    },
    [slot, autoSaveDelay]
  );

  // Flush pending updates on unmount and beforeunload
  useEffect(() => {
    const flush = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pendingUpdate.current) {
        useGamePlayStore
          .getState()
          .updateProgress(slot, ...pendingUpdate.current);
        pendingUpdate.current = null;
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', flush);
    }
    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('beforeunload', flush);
      }
      flush();
    };
  }, [slot]);

  return {
    currentGame,
    hasCurrentGame: currentGame !== null,
    startGame,
    updateProgress,
    clearGame,
  };
}
