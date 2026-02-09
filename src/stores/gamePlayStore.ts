/**
 * Zustand store for current game state
 *
 * Persists two independent game slots (daily / play) to localStorage
 * so users can resume where they left off without one overwriting the other.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CurrentGame,
  CurrentGameMeta,
  GameSlot,
  GameSource,
} from '../types/currentGame';

type SlotField = 'dailyGame' | 'playGame';

const slotField = (slot: GameSlot): SlotField =>
  slot === 'daily' ? 'dailyGame' : 'playGame';

export interface GamePlayState {
  /** Daily game slot (null if none) */
  dailyGame: CurrentGame | null;
  /** Play game slot — levels & entered puzzles (null if none) */
  playGame: CurrentGame | null;

  /** Start a new game in the given slot */
  startGame: (
    slot: GameSlot,
    source: GameSource,
    puzzle: string,
    solution: string,
    meta?: CurrentGameMeta
  ) => void;

  /** Update game progress for the given slot */
  updateProgress: (
    slot: GameSlot,
    inputString: string,
    pencilmarksString: string,
    isPencilMode: boolean,
    elapsedTime: number
  ) => void;

  /** Clear the game in the given slot */
  clearGame: (slot: GameSlot) => void;
}

export const useGamePlayStore = create<GamePlayState>()(
  persist(
    (set, get) => ({
      dailyGame: null,
      playGame: null,

      startGame: (slot, source, puzzle, solution, meta = {}) => {
        const now = new Date().toISOString();
        set({
          [slotField(slot)]: {
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
        slot,
        inputString,
        pencilmarksString,
        isPencilMode,
        elapsedTime
      ) => {
        const field = slotField(slot);
        const current = get()[field];
        if (!current) return;

        set({
          [field]: {
            ...current,
            inputString,
            pencilmarksString,
            isPencilMode,
            elapsedTime,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      clearGame: (slot) => set({ [slotField(slot)]: null }),
    }),
    {
      name: 'sudojo-current-game',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // v0 had a single `currentGame` field — move it to the right slot
          const old = persistedState as {
            currentGame?: CurrentGame | null;
          };
          const game = old.currentGame ?? null;
          const isDailySource = game?.source === 'daily';

          // Remove the old field and populate the new slots
          const { currentGame: _, ...rest } = old as Record<string, unknown>;
          return {
            ...rest,
            dailyGame: isDailySource ? game : null,
            playGame: isDailySource ? null : game,
          };
        }
        return persistedState;
      },
    }
  )
);
