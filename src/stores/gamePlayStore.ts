/**
 * Zustand store for current game state
 *
 * Persists the current game to localStorage so users can resume
 * where they left off.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CurrentGame,
  CurrentGameMeta,
  GameSource,
} from '../types/currentGame';

export interface GamePlayState {
  /** Current game (null if none) */
  currentGame: CurrentGame | null;

  /** Start a new game - clears any existing game */
  startGame: (
    source: GameSource,
    puzzle: string,
    solution: string,
    meta?: CurrentGameMeta
  ) => void;

  /** Update game progress (call periodically during play) */
  updateProgress: (
    inputString: string,
    pencilmarksString: string,
    isPencilMode: boolean,
    elapsedTime: number
  ) => void;

  /** Clear current game (call on completion) */
  clearGame: () => void;
}

export const useGamePlayStore = create<GamePlayState>()(
  persist(
    (set, get) => ({
      currentGame: null,

      startGame: (source, puzzle, solution, meta = {}) => {
        const now = new Date().toISOString();
        set({
          currentGame: {
            source,
            puzzle,
            solution,
            meta,
            inputString: '0'.repeat(81),
            pencilmarksString: '',
            isPencilMode: false,
            elapsedTime: 0,
            startedAt: now,
            updatedAt: now,
          },
        });
      },

      updateProgress: (
        inputString,
        pencilmarksString,
        isPencilMode,
        elapsedTime
      ) => {
        const current = get().currentGame;
        if (!current) return;

        set({
          currentGame: {
            ...current,
            inputString,
            pencilmarksString,
            isPencilMode,
            elapsedTime,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      clearGame: () => set({ currentGame: null }),
    }),
    {
      name: 'sudojo-current-game',
    }
  )
);
