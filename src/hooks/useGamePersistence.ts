/**
 * Hook for persisting game state to localStorage
 *
 * Saves game progress automatically so users can resume where they left off
 */

import { useCallback, useEffect, useRef } from 'react';
import type {
  GamePersistenceKey,
  SavedGameState,
} from '../types/gamePersistence';
import { getGameStorageKey } from '../types/gamePersistence';

export interface UseGamePersistenceOptions {
  /** Puzzle identifier */
  puzzleKey: GamePersistenceKey | null;
  /** Whether auto-save is enabled */
  autoSave?: boolean;
  /** Debounce delay in ms for auto-save */
  debounceMs?: number;
}

export interface UseGamePersistenceResult {
  /** Load saved game state */
  loadGame: () => SavedGameState | null;
  /** Save current game state */
  saveGame: (state: Omit<SavedGameState, 'savedAt'>) => void;
  /** Clear saved game state */
  clearGame: () => void;
  /** Check if saved game exists */
  hasSavedGame: () => boolean;
}

/**
 * Hook for persisting individual game progress
 *
 * @param options - Hook options
 * @returns Functions to load, save, and clear game state
 *
 * @example
 * ```tsx
 * const { loadGame, saveGame, clearGame } = useGamePersistence({
 *   puzzleKey: { type: 'daily', id: '2024-01-15' },
 *   autoSave: true,
 * });
 *
 * // On mount, try to restore saved state
 * useEffect(() => {
 *   const saved = loadGame();
 *   if (saved) {
 *     // Restore game state
 *   }
 * }, []);
 *
 * // Save after each move
 * useEffect(() => {
 *   saveGame({ inputString, pencilmarksString, isPencilMode });
 * }, [inputString, pencilmarksString, isPencilMode]);
 * ```
 */
export function useGamePersistence({
  puzzleKey,
}: UseGamePersistenceOptions): UseGamePersistenceResult {
  const storageKey = puzzleKey ? getGameStorageKey(puzzleKey) : null;

  const loadGame = useCallback((): SavedGameState | null => {
    if (!storageKey) return null;

    try {
      const item = window.localStorage.getItem(storageKey);
      if (!item) return null;
      return JSON.parse(item) as SavedGameState;
    } catch (error) {
      console.warn('Error loading saved game:', error);
      return null;
    }
  }, [storageKey]);

  const saveGame = useCallback(
    (state: Omit<SavedGameState, 'savedAt'>) => {
      if (!storageKey) return;

      try {
        const savedState: SavedGameState = {
          ...state,
          savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(storageKey, JSON.stringify(savedState));
      } catch (error) {
        console.warn('Error saving game:', error);
      }
    },
    [storageKey]
  );

  const clearGame = useCallback(() => {
    if (!storageKey) return;

    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Error clearing saved game:', error);
    }
  }, [storageKey]);

  const hasSavedGame = useCallback((): boolean => {
    if (!storageKey) return false;

    try {
      return window.localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey]);

  return {
    loadGame,
    saveGame,
    clearGame,
    hasSavedGame,
  };
}

/**
 * Hook that auto-saves game state with debouncing
 *
 * @param puzzleKey - Key identifying the puzzle
 * @param getCurrentState - Function to get current game state
 * @param dependencies - Dependencies that trigger save
 * @param debounceMs - Debounce delay in ms (default: 1000)
 */
export function useAutoSave(
  puzzleKey: GamePersistenceKey | null,
  getCurrentState: () => Omit<SavedGameState, 'savedAt'> | null,
  dependencies: unknown[],
  debounceMs: number = 1000
): void {
  const { saveGame } = useGamePersistence({ puzzleKey });
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!puzzleKey) return;

    // Clear any pending save
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
    }

    // Schedule new save
    timeoutRef.current = globalThis.setTimeout(() => {
      const state = getCurrentState();
      if (state) {
        saveGame(state);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, [puzzleKey, saveGame, debounceMs, ...dependencies]);
}

// Re-export types for convenience
export type { SavedGameState, GamePersistenceKey };
