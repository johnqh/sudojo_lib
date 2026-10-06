/**
 * Save / resume orchestration for an entered (typed-in or scanned) puzzle,
 * after useBoardEntry validated it. Port of the web EnterBoard's play-mode
 * logic. Entered puzzles get no server session (no gamification), and their
 * completion is not recorded in progress.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CurrentGameMeta } from '../types/currentGame';
import type { BoardEntryPlayState, ValidatedPuzzle } from './useBoardEntry';
import { useGamePlay } from './useGamePlay';
import type { PuzzleGameProps } from './usePuzzleSession';
import { useResumeGame, type UseResumeGameResult } from './useResumeGame';

export interface UseEnteredGameSessionOptions {
  /** useBoardEntry's validatedPuzzle (null until Validate succeeds) */
  validatedPuzzle: ValidatedPuzzle | null | undefined;
  /** useBoardEntry's initialPlayState (entry pencilmarks) */
  initialPlayState?: BoardEntryPlayState | undefined;
  /** The resume decision (default: useResumeGame({ source: 'entered' })) */
  resume?: UseResumeGameResult | undefined;
  /** Forwarded to the internal useResumeGame (RN: its onStoreReady state) */
  isStoreHydrated?: boolean | undefined;
  /**
   * Called by newGame() to reset the entry board (pass useBoardEntry's
   * `reset`), so the old validatedPuzzle does not start play again.
   */
  onReset?: () => void;
}

export interface UseEnteredGameSessionResult {
  /** Whether the resume decision is made (store hydrated) */
  isReady: boolean;
  /** Whether a saved entered game is being resumed */
  isResuming: boolean;
  /** The puzzle to play (resumed, else validated), or null while entering */
  activePuzzle: ValidatedPuzzle | null;
  /** Whether to show the game (there is an active puzzle) instead of entry */
  isPlaying: boolean;
  /**
   * Props for the game component, or null while entering. Always
   * `scramble: false`. Initial state comes from the saved game when resuming,
   * else from initialPlayState.
   */
  gameProps: PuzzleGameProps | null;
  /** Remount key for the game component (the puzzle string), or null */
  gameKey: string | null;
  /** Web SudokuGame's onScrambledReady: saves the game once per puzzle */
  onScrambledReady: (board: { puzzle: string; solution: string }) => void;
  /** RN SudokuGame's onBoardReady: same as onScrambledReady */
  onBoardReady: (puzzle: string, solution: string) => void;
  /** The game's onProgressUpdate (throttled save) */
  onProgress: (
    inputString: string,
    pencilmarksString: string,
    isPencilMode: boolean,
    autoPencilmarks: boolean,
    elapsedTime: number
  ) => void;
  /** The game's onComplete: clears the saved game (nothing else) */
  onComplete: () => void;
  /** Back to entry: clear the save, stop resuming, call onReset */
  newGame: () => void;
}

/**
 * @example
 * ```tsx
 * const entry = useBoardEntry();
 * const session = useEnteredGameSession({
 *   validatedPuzzle: entry.validatedPuzzle,
 *   initialPlayState: entry.initialPlayState,
 *   onReset: entry.reset,
 * });
 * if (session.isPlaying) {
 *   return <SudokuGame key={session.gameKey} {...session.gameProps}
 *     onScrambledReady={session.onScrambledReady} onProgressUpdate={session.onProgress}
 *     onComplete={session.onComplete} onNewGame={session.newGame} />;
 * }
 * ```
 */
export function useEnteredGameSession(
  options: UseEnteredGameSessionOptions
): UseEnteredGameSessionResult {
  const { validatedPuzzle, initialPlayState, onReset } = options;

  const internalResume = useResumeGame({
    source: 'entered',
    slot: 'play',
    ...(options.isStoreHydrated !== undefined && {
      isStoreHydrated: options.isStoreHydrated,
    }),
  });
  const resume = options.resume ?? internalResume;
  const resumeGame = resume.resumeGame;
  const isResuming = resumeGame !== null;

  const { startGame, updateProgress, clearGame } = useGamePlay({
    slot: 'play',
  });

  const resumedPuzzle = useMemo((): ValidatedPuzzle | null => {
    if (!resumeGame) return null;
    // Level and score were saved with the game, since resuming does not
    // validate again.
    const puzzle: ValidatedPuzzle = {
      puzzle: resumeGame.puzzle,
      solution: resumeGame.solution,
    };
    if (resumeGame.meta.level !== undefined) {
      puzzle.level = resumeGame.meta.level;
    }
    if (resumeGame.meta.difficultyScore !== undefined) {
      puzzle.difficultyScore = resumeGame.meta.difficultyScore;
    }
    return puzzle;
  }, [resumeGame]);

  const activePuzzle = resumedPuzzle ?? validatedPuzzle ?? null;
  const gameKey = activePuzzle?.puzzle ?? null;

  // --- Save the fresh game once the game reports its board -----------------
  const [reported, setReported] = useState<{
    key: string;
    puzzle: string;
    solution: string;
  } | null>(null);

  const onScrambledReady = useCallback(
    (board: { puzzle: string; solution: string }) => {
      if (!gameKey) return;
      if (board.puzzle.length !== 81 || board.solution.length !== 81) return;
      setReported(prev =>
        prev?.key === gameKey &&
        prev.puzzle === board.puzzle &&
        prev.solution === board.solution
          ? prev
          : { key: gameKey, ...board }
      );
    },
    [gameKey]
  );

  const onBoardReady = useCallback(
    (puzzle: string, solution: string) => {
      onScrambledReady({ puzzle, solution });
    },
    [onScrambledReady]
  );

  const startedRef = useRef('');
  const pencilmarks = initialPlayState?.pencilmarks;
  const autopencil = initialPlayState?.autopencil ?? false;
  useEffect(() => {
    if (isResuming || !activePuzzle || !reported) return;
    if (reported.key !== gameKey || startedRef.current === gameKey) return;
    startedRef.current = gameKey;
    const meta: CurrentGameMeta = {};
    if (activePuzzle.level !== undefined) meta.level = activePuzzle.level;
    if (activePuzzle.difficultyScore !== undefined) {
      meta.difficultyScore = activePuzzle.difficultyScore;
    }
    startGame(
      'entered',
      {
        original: reported.puzzle,
        user: reported.puzzle,
        pencilmark: pencilmarks
          ? { numbers: pencilmarks, autopencil }
          : { numbers: '', autopencil: false },
      },
      reported.solution,
      meta
    );
  }, [
    isResuming,
    activePuzzle,
    reported,
    gameKey,
    pencilmarks,
    autopencil,
    startGame,
  ]);

  const discardResume = resume.discard;
  const onComplete = useCallback(() => {
    clearGame();
  }, [clearGame]);

  const newGame = useCallback(() => {
    clearGame();
    discardResume();
    setReported(null);
    startedRef.current = '';
    onReset?.();
  }, [clearGame, discardResume, onReset]);

  const gameProps = useMemo((): PuzzleGameProps | null => {
    if (!activePuzzle) return null;
    if (resumeGame) {
      return {
        puzzle: activePuzzle.puzzle,
        solution: activePuzzle.solution,
        scramble: false,
        initialInput: resumeGame.inputString,
        initialPencilmarks: resumeGame.pencilmarksString,
        initialElapsedTime: resumeGame.elapsedTime,
        initialAutoPencilmarks: resumeGame.autoPencilmarks,
      };
    }
    return {
      puzzle: activePuzzle.puzzle,
      solution: activePuzzle.solution,
      scramble: false,
      initialInput: initialPlayState?.input,
      initialPencilmarks: initialPlayState?.pencilmarks,
      initialAutoPencilmarks: initialPlayState?.autopencil,
    };
  }, [activePuzzle, resumeGame, initialPlayState]);

  return {
    isReady: resume.isReady,
    isResuming,
    activePuzzle,
    isPlaying: activePuzzle !== null,
    gameProps,
    gameKey,
    onScrambledReady,
    onBoardReady,
    onProgress: updateProgress,
    onComplete,
    newGame,
  };
}
