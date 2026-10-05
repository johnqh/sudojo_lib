/**
 * Hook for deciding, once per puzzle screen, whether to resume the saved game
 * from the game store instead of fetching a new puzzle.
 */

import { useCallback, useEffect, useState } from 'react';
import { useGamePlayStore } from '../stores/gamePlayStore';
import type { CurrentGame, GameSlot } from '../types/currentGame';
import { isStaleDaily } from '../utils/date';

/** Which kind of puzzle screen a session belongs to. */
export type PuzzleSessionSource = 'daily' | 'level';

/** Which saved games useResumeGame / getResumeGame can resume. */
export type ResumeGameSource = PuzzleSessionSource | 'entered';

/**
 * The saved game to resume for a screen, or null.
 *
 * A game resumes when its source matches, its puzzle and solution are both 81
 * characters, and: for a daily, it has a dailyDate (and, unless
 * `allowStaleDaily`, that date is today's UTC daily); for a level, its
 * meta.levelId equals `String(levelNumber)`; an entered puzzle needs nothing
 * more.
 */
export function getResumeGame(
  game: CurrentGame | null | undefined,
  criteria: {
    source: ResumeGameSource;
    levelNumber?: number | null | undefined;
    allowStaleDaily?: boolean;
    now?: Date;
  }
): CurrentGame | null {
  if (
    !game ||
    game.source !== criteria.source ||
    !game.puzzle ||
    !game.solution ||
    game.puzzle.length !== 81 ||
    game.solution.length !== 81
  ) {
    return null;
  }
  if (criteria.source === 'daily') {
    if (!game.meta.dailyDate) return null;
    if (
      !criteria.allowStaleDaily &&
      isStaleDaily(game.meta.dailyDate, criteria.now)
    ) {
      return null;
    }
    return game;
  }
  if (criteria.source === 'entered') return game;
  if (
    criteria.levelNumber == null ||
    game.meta.levelId !== String(criteria.levelNumber)
  ) {
    return null;
  }
  return game;
}

/** Whether the game store has finished hydrating from storage. */
function useGameStoreHydrated(): boolean {
  const persistApi = useGamePlayStore.persist;
  const [hydrated, setHydrated] = useState(
    () => persistApi?.hasHydrated?.() ?? true
  );
  useEffect(() => {
    if (!persistApi) return undefined;
    const offStart = persistApi.onHydrate?.(() => setHydrated(false));
    const offFinish = persistApi.onFinishHydration?.(() => setHydrated(true));
    setHydrated(persistApi.hasHydrated?.() ?? true);
    return () => {
      offStart?.();
      offFinish?.();
    };
  }, [persistApi]);
  return hydrated;
}

export interface UseResumeGameOptions {
  /** 'daily', 'level' or 'entered' */
  source: ResumeGameSource;
  /** For a level screen: the level number (1-12) */
  levelNumber?: number | null | undefined;
  /** Store slot (default: 'daily' for dailies, 'play' for levels and entered puzzles) */
  slot?: GameSlot;
  /**
   * Clear a saved daily that is not today's (UTC) daily instead of resuming
   * it (default true; RN's rule, see usePuzzleSession)
   */
  clearStaleDaily?: boolean;
  /**
   * Whether the store has hydrated. Default: the store's own persist
   * hydration. RN passes its onStoreReady state, because it swaps the store
   * to AsyncStorage and rehydrates after start-up.
   */
  isStoreHydrated?: boolean;
}

export interface UseResumeGameResult {
  /** The saved game to resume (snapshot taken once per screen), or null */
  resumeGame: CurrentGame | null;
  /** True once the store has hydrated and the resume decision is made */
  isReady: boolean;
  /** Stop resuming (after New game or completion) */
  discard: () => void;
}

interface ResumeSnapshot {
  key: string;
  game: CurrentGame | null;
  /** A stale daily found in the slot, to clear from the store */
  stale: CurrentGame | null;
}

/**
 * Decide once per screen (slot + source + level) whether there is a saved game
 * to resume. The decision is a snapshot: starting a fresh game later (which
 * writes to the same slot) does not flip the screen into "resuming", as on RN.
 *
 * Call it before the fetch hook, and disable the fetch while resuming:
 *
 * @example
 * ```tsx
 * const resume = useResumeGame({ source: 'level', levelNumber });
 * const { board, status } = useLevelGame({
 *   level: levelNumber,
 *   enabled: resume.isReady && !resume.resumeGame,
 * });
 * const session = usePuzzleSession({ resume, source: 'level', levelNumber, puzzle: board, fetchStatus: status, user });
 * ```
 */
export function useResumeGame(
  options: UseResumeGameOptions
): UseResumeGameResult {
  const {
    source,
    levelNumber,
    slot = source === 'daily' ? 'daily' : 'play',
    clearStaleDaily = true,
  } = options;
  const storeHydrated = useGameStoreHydrated();
  const hydrated = options.isStoreHydrated ?? storeHydrated;
  const key = `${slot}|${source}|${levelNumber ?? ''}`;

  const [snapshot, setSnapshot] = useState<ResumeSnapshot | null>(null);

  // Take the snapshot during render (derived state), once per key.
  let current = snapshot;
  if (hydrated && snapshot?.key !== key) {
    const state = useGamePlayStore.getState();
    const saved = slot === 'daily' ? state.dailyGame : state.playGame;
    const game = getResumeGame(saved, {
      source,
      levelNumber,
      allowStaleDaily: !clearStaleDaily,
    });
    const stale =
      !game &&
      clearStaleDaily &&
      source === 'daily' &&
      saved?.source === 'daily' &&
      isStaleDaily(saved.meta.dailyDate)
        ? saved
        : null;
    current = { key, game, stale };
    setSnapshot(current);
  }

  // Clear a stale daily (if the slot still holds it).
  const staleGame = current?.stale ?? null;
  useEffect(() => {
    if (!staleGame) return;
    const state = useGamePlayStore.getState();
    const saved = slot === 'daily' ? state.dailyGame : state.playGame;
    if (saved === staleGame) state.clearGame(slot);
  }, [staleGame, slot]);

  const discard = useCallback(() => {
    setSnapshot({ key, game: null, stale: null });
  }, [key]);

  const isReady = hydrated && current?.key === key;
  return {
    resumeGame: isReady ? (current?.game ?? null) : null,
    isReady,
    discard,
  };
}
