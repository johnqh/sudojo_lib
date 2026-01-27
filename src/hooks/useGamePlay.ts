/**
 * Hook for managing the current game
 *
 * Provides a clean API for starting, updating, and clearing the current game.
 * Includes debounced auto-save to avoid excessive localStorage writes.
 *
 * @example
 * ```tsx
 * const { currentGame, startGame, updateProgress, clearGame } = useGamePlay();
 *
 * // Start a new game
 * startGame('daily', puzzle, solution, { dailyDate: '2024-01-15' });
 *
 * // Update progress (debounced)
 * updateProgress(inputString, pencilmarksString, isPencilMode, elapsedTime);
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
  GameSource,
} from '../types/currentGame';

// Get stable reference to store actions (doesn't change on state updates)
const getStoreActions = () => useGamePlayStore.getState();

export interface UseGamePlayOptions {
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
    elapsedTime: number
  ) => void;
  /** Clear current game (call on completion) */
  clearGame: () => void;
}

export function useGamePlay(
  options: UseGamePlayOptions = {}
): UseGamePlayResult {
  const { autoSaveDelay = 2000 } = options;
  const store = useGamePlayStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdate = useRef<[string, string, boolean, number] | null>(null);

  // Debounced update - uses getState() for stable reference
  const updateProgress = useCallback(
    (
      inputString: string,
      pencilmarksString: string,
      isPencilMode: boolean,
      elapsedTime: number
    ) => {
      pendingUpdate.current = [
        inputString,
        pencilmarksString,
        isPencilMode,
        elapsedTime,
      ];

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (pendingUpdate.current) {
          // Use getState() to get stable reference that doesn't trigger re-renders
          getStoreActions().updateProgress(...pendingUpdate.current);
          pendingUpdate.current = null;
        }
      }, autoSaveDelay);
    },
    [autoSaveDelay]
  );

  // Flush pending updates on unmount only
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingUpdate.current) {
        // Use getState() to get stable reference that doesn't trigger re-renders
        getStoreActions().updateProgress(...pendingUpdate.current);
      }
    };
  }, []); // Empty deps - only run cleanup on actual unmount

  return {
    currentGame: store.currentGame,
    hasCurrentGame: store.currentGame !== null,
    startGame: store.startGame,
    updateProgress,
    clearGame: store.clearGame,
  };
}
