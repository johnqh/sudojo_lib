/**
 * Game session orchestration for the Daily and Level play screens.
 *
 * Combines the saved-game store (useGamePlay), the resume decision
 * (useResumeGame) and server gamification (useGameSession) into what a play
 * screen renders: which puzzle to show and how (fresh and scrambled, or
 * resumed with its saved input), when to save the game and start the server
 * session, and what to do on completion (clear the save, finish the session,
 * show achievements, record progress). Platform-neutral: no router, no
 * dialogs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameStartRequest } from '@sudobility/sudojo_types';
import type { GameFetchStatus } from '../utils/gameFetchStatus';
import type { SudojoApiOptions } from '../context/SudojoApiContext';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import type { CurrentGame, CurrentGameMeta } from '../types/currentGame';
import { type AuthUser, isRealUser } from '../utils/auth';
import type { PuzzleCompletion } from '../utils/progress';
import {
  techniqueBitmaskString,
  techniqueFieldsOf,
} from '../utils/techniqueBitmask';
import { type GameFinishResult, useGameSession } from './useGameSession';
import { useGamePlay } from './useGamePlay';
import {
  type PuzzleSessionSource,
  useResumeGame,
  type UseResumeGameResult,
} from './useResumeGame';

/** The fetched puzzle a session plays: a Daily or a Board from the API. */
export interface SessionPuzzleInput {
  uuid: string;
  /** 81-char puzzle */
  board: string;
  /** 81-char solution */
  solution: string;
  level?: number | null;
  techniques?: number | null;
  techniques_bitmask?: string | null;
  difficulty_score?: number | null;
  /** A daily's date (YYYY-MM-DD) */
  date?: string | null;
}

/** The puzzle the screen shows (fetched, or rebuilt from the saved game). */
export interface ActivePuzzle {
  /** Board/daily uuid (for a resumed game: its boardUuid, else startedAt) */
  uuid: string;
  /** 81-char puzzle (a resumed game's is already scrambled) */
  puzzle: string;
  /** 81-char solution */
  solution: string;
  /** Difficulty level (1-12), when known */
  level: number | null;
  /** Solver difficulty score, when known */
  difficultyScore: number | null;
  /** A daily's date (YYYY-MM-DD) */
  dailyDate: string | null;
  /** Lossy techniques bitmask */
  techniques: number | null;
  /** Exact techniques bitmask (base-10 string) */
  techniques_bitmask: string | null;
}

/** Props for the game component (SudokuGame) of either app. */
export interface PuzzleGameProps {
  puzzle: string;
  solution: string;
  /** false when resuming (the saved puzzle is already scrambled) */
  scramble: boolean;
  initialInput?: string | undefined;
  initialPencilmarks?: string | undefined;
  initialElapsedTime?: number | undefined;
  initialAutoPencilmarks?: boolean | undefined;
}

export interface UsePuzzleSessionOptions extends SudojoApiOptions {
  /** 'daily' or 'level' */
  source: PuzzleSessionSource;
  /** Level screens: the level number (1-12) */
  levelNumber?: number | null | undefined;
  /** Level screens: the level's title (saved in meta for "Continue") */
  levelTitle?: string | null | undefined;
  /**
   * The fetched puzzle (useDailyGame's `daily` / useLevelGame's `board`), or
   * null while loading. Ignored while resuming.
   */
  puzzle: SessionPuzzleInput | null | undefined;
  /** Dailies: useDailyGame's `dailyDate` (default: the puzzle's `date`) */
  dailyDate?: string | null | undefined;
  /** The fetch hook's status (default 'loading' until a puzzle arrives) */
  fetchStatus?: GameFetchStatus | undefined;
  /** The signed-in user: server sessions run only for a real (non-anonymous) user */
  user?: AuthUser | null | undefined;
  /** The resume decision from useResumeGame (default: computed here) */
  resume?: UseResumeGameResult | undefined;
  /** Forwarded to the internal useResumeGame when `resume` is not passed */
  isStoreHydrated?: boolean | undefined;
  /** Forwarded to the internal useResumeGame (default true) */
  clearStaleDaily?: boolean | undefined;
  /**
   * Whether a puzzle was already completed (progress). A completed daily is
   * not saved, started on the server, or recorded again (web DailyPage).
   */
  isPuzzleCompleted?: (type: 'daily' | 'level', id: string) => boolean;
  /** Record a completion in the player's progress (web markCompleted) */
  onPuzzleCompleted?: (completion: PuzzleCompletion) => void;
  /**
   * Start a server session for a resumed game too (RN DailyScreen did; the web
   * does not). Default false: the session from when the game was started is
   * still the server's active one, and restarting it resets its clock.
   */
  startSessionOnResume?: boolean;
  /**
   * Show the achievement modal even when nothing was earned (RN did).
   * Default false (web: only on level-up, new badges or points).
   */
  showEmptyAchievement?: boolean;
}

export interface UsePuzzleSessionResult {
  /**
   * 'success' once a puzzle is pinned or resumed; otherwise the fetch status
   * ('loading' until the store is ready and while a fetched puzzle is not
   * pinned yet)
   */
  status: GameFetchStatus;
  /** Whether the resume decision is made (store hydrated) */
  isReady: boolean;
  /** Whether the screen resumes a saved game */
  isResuming: boolean;
  /** The saved game being resumed, or null */
  resumeGame: CurrentGame | null;
  /** The puzzle to show (pinned once loaded), or null */
  activePuzzle: ActivePuzzle | null;
  /**
   * Props for the game component, or null while there is no puzzle. Render
   * it with `key={gameKey}` so a new puzzle remounts the game.
   */
  gameProps: PuzzleGameProps | null;
  /** Remount key for the game component (the puzzle's uuid), or null */
  gameKey: string | null;
  /** The puzzle's progress id: the daily date, or the board uuid */
  puzzleId: string | null;
  /** Whether this puzzle was already completed (isPuzzleCompleted) */
  alreadyCompleted: boolean;
  /** Whether server gamification is active (real user with a token) */
  isAuthenticated: boolean;
  /** Web SudokuGame's onScrambledReady: saves the fresh game and starts the session */
  onScrambledReady: (scrambled: { puzzle: string; solution: string }) => void;
  /** RN SudokuGame's onBoardReady: same as onScrambledReady */
  onBoardReady: (scrambledPuzzle: string, scrambledSolution: string) => void;
  /** The game's onProgressUpdate: saves progress (throttled) */
  onProgress: (
    inputString: string,
    pencilmarksString: string,
    isPencilMode: boolean,
    autoPencilmarks: boolean,
    elapsedTime: number
  ) => void;
  /**
   * The game's onComplete: clears the save, finishes the server session
   * (sets the achievement state), records progress. Resolves to the finish
   * result (null when not authenticated).
   */
  onComplete: (timeSeconds: number) => Promise<GameFinishResult | null>;
  /**
   * Abandon the current puzzle: clear the save, stop resuming, unpin. Call the
   * fetch hook's nextPuzzle()/refetch() too; the old puzzle is not pinned again.
   */
  newGame: () => void;
  /** Achievement result to show, or null */
  achievementResult: GameFinishResult | null;
  /** Whether the achievement modal is open */
  showAchievement: boolean;
  /** Close the achievement modal */
  closeAchievement: () => void;
}

function hasAchievement(result: GameFinishResult): boolean {
  return (
    result.leveledUp ||
    result.newBadges.length > 0 ||
    result.totalPointsEarned > 0
  );
}

function puzzleFromResume(
  game: CurrentGame,
  source: PuzzleSessionSource,
  levelNumber: number | null | undefined
): ActivePuzzle {
  const meta = game.meta;
  return {
    uuid: meta.boardUuid ?? game.startedAt ?? game.updatedAt ?? 'resume',
    puzzle: game.puzzle,
    solution: game.solution,
    level: meta.level ?? (source === 'level' ? (levelNumber ?? null) : null),
    difficultyScore: meta.difficultyScore ?? null,
    dailyDate: meta.dailyDate ?? null,
    ...techniqueFieldsOf(meta),
  };
}

function puzzleFromFetch(
  input: SessionPuzzleInput,
  source: PuzzleSessionSource,
  levelNumber: number | null | undefined,
  dailyDate: string | null | undefined
): ActivePuzzle {
  return {
    uuid: input.uuid,
    puzzle: input.board,
    solution: input.solution,
    level: input.level ?? (source === 'level' ? (levelNumber ?? null) : null),
    difficultyScore: input.difficulty_score ?? null,
    dailyDate: source === 'daily' ? (dailyDate ?? input.date ?? null) : null,
    ...techniqueFieldsOf(input),
  };
}

/**
 * Orchestrate a Daily or Level play screen.
 *
 * Behavior (web DailyPage / LevelPlayPage, with RN's stale-daily rule):
 * - Resume: a saved game for this screen (see getResumeGame) is shown with
 *   `scramble: false` and its saved input, pencilmarks, time and auto-pencil.
 *   A saved daily from another (UTC) day is cleared, not resumed.
 * - Fresh puzzle: pinned once loaded (refetches cannot unmount the game).
 *   When the game reports its scrambled board (onScrambledReady /
 *   onBoardReady) the game is saved once per puzzle uuid with meta (dailyDate
 *   or levelId/levelTitle, boardUuid, level, difficultyScore, techniques +
 *   exact techniques_bitmask), and a server session is started once per uuid
 *   for a real user (a daily only when it has a level). A daily already in
 *   progress is skipped.
 * - Completion: clear the save, finish the server session (authenticated),
 *   open the achievement modal when something was earned, then record
 *   progress (`onPuzzleCompleted`, not again for a completed daily).
 *
 * @example Daily
 * ```tsx
 * const resume = useResumeGame({ source: 'daily' });
 * const { daily, dailyDate, status, refetch } = useDailyGame({ enabled: resume.isReady && !resume.resumeGame });
 * const { markCompleted, isCompleted } = usePuzzleProgress();
 * const session = usePuzzleSession({
 *   source: 'daily', resume, puzzle: daily, dailyDate, fetchStatus: status, user,
 *   isPuzzleCompleted: isCompleted, onPuzzleCompleted: markCompleted,
 * });
 * if (session.status === 'auth_required') return <SignInGate />;
 * return session.gameProps && (
 *   <>
 *     <SudokuGame key={session.gameKey} {...session.gameProps} onScrambledReady={session.onScrambledReady}
 *       onProgressUpdate={session.onProgress} onComplete={session.onComplete} />
 *     <AchievementModal show={session.showAchievement} onClose={session.closeAchievement}
 *       {...session.achievementResult} />
 *   </>
 * );
 * ```
 *
 * @example LevelPlay
 * ```tsx
 * const resume = useResumeGame({ source: 'level', levelNumber });
 * const { board, status, nextPuzzle } = useLevelGame({
 *   level: levelNumber, symmetrical, userEntitlements, levelEntitlement,
 *   enabled: resume.isReady && !resume.resumeGame,
 * });
 * const session = usePuzzleSession({
 *   source: 'level', levelNumber, levelTitle: level?.title, resume,
 *   puzzle: board, fetchStatus: status, user, onPuzzleCompleted: markCompleted,
 * });
 * const onNewGame = () => { session.newGame(); nextPuzzle(); };
 * // RN: <SudokuGame key={session.gameKey} {...session.gameProps} onBoardReady={session.onBoardReady} ... />
 * ```
 */
export function usePuzzleSession(
  options: UsePuzzleSessionOptions
): UsePuzzleSessionResult {
  const {
    source,
    levelNumber,
    levelTitle,
    puzzle: fetched,
    dailyDate: fetchedDailyDate,
    fetchStatus,
    user,
    isPuzzleCompleted,
    onPuzzleCompleted,
    startSessionOnResume = false,
    showEmptyAchievement = false,
  } = options;
  const api = useResolvedSudojoApi(options, 'usePuzzleSession');
  const slot = source === 'daily' ? 'daily' : 'play';

  const internalResume = useResumeGame({
    source,
    levelNumber,
    slot,
    ...(options.clearStaleDaily !== undefined && {
      clearStaleDaily: options.clearStaleDaily,
    }),
    ...(options.isStoreHydrated !== undefined && {
      isStoreHydrated: options.isStoreHydrated,
    }),
  });
  const resume = options.resume ?? internalResume;
  const resumeGame = resume.resumeGame;
  const isResuming = resumeGame !== null;

  const { startGame, updateProgress, clearGame } = useGamePlay({ slot });
  const { startSession, finishSession, isAuthenticated } = useGameSession({
    networkClient: api.networkClient,
    baseUrl: api.baseUrl,
    token: api.token,
    userId: isRealUser(user) && user ? user.uid : null,
  });

  // --- Pinned fresh puzzle -------------------------------------------------
  const screenKey = `${source}|${levelNumber ?? ''}`;
  const [pinned, setPinned] = useState<{
    key: string;
    puzzle: ActivePuzzle;
  } | null>(null);
  const excludedUuidRef = useRef<string | null>(null);

  const fetchedPuzzle = useMemo(
    () =>
      fetched && fetched.board?.length === 81 && fetched.solution?.length === 81
        ? puzzleFromFetch(fetched, source, levelNumber, fetchedDailyDate)
        : null,
    [fetched, source, levelNumber, fetchedDailyDate]
  );

  useEffect(() => {
    if (isResuming || !fetchedPuzzle) return;
    if (fetchStatus !== undefined && fetchStatus !== 'success') return;
    if (pinned?.key === screenKey) return;
    if (excludedUuidRef.current === fetchedPuzzle.uuid) return;
    excludedUuidRef.current = null;
    setPinned({ key: screenKey, puzzle: fetchedPuzzle });
  }, [isResuming, fetchedPuzzle, fetchStatus, pinned, screenKey]);

  const resumedPuzzle = useMemo(
    () =>
      resumeGame ? puzzleFromResume(resumeGame, source, levelNumber) : null,
    [resumeGame, source, levelNumber]
  );
  const activePuzzle =
    resumedPuzzle ?? (pinned?.key === screenKey ? pinned.puzzle : null);

  // 'success' only with a puzzle to show: a fetched puzzle that is not
  // pinned yet (or was abandoned by newGame) still reads as loading.
  const status: GameFetchStatus =
    !resume.isReady || (!activePuzzle && fetchStatus === 'success')
      ? 'loading'
      : activePuzzle
        ? 'success'
        : (fetchStatus ?? 'loading');

  const puzzleId =
    source === 'daily'
      ? (activePuzzle?.dailyDate ?? null)
      : (activePuzzle?.uuid ?? null);
  const alreadyCompleted =
    source === 'daily' && puzzleId !== null
      ? (isPuzzleCompleted?.('daily', puzzleId) ?? false)
      : false;

  // --- Save the fresh game and start the server session -------------------
  const [scrambled, setScrambled] = useState<{
    uuid: string;
    puzzle: string;
    solution: string;
  } | null>(null);
  const activeUuid = activePuzzle?.uuid ?? null;

  const onScrambledReady = useCallback(
    (data: { puzzle: string; solution: string }) => {
      if (!activeUuid) return;
      if (data.puzzle.length !== 81 || data.solution.length !== 81) return;
      setScrambled(prev =>
        prev?.uuid === activeUuid &&
        prev.puzzle === data.puzzle &&
        prev.solution === data.solution
          ? prev
          : { uuid: activeUuid, ...data }
      );
    },
    [activeUuid]
  );

  const onBoardReady = useCallback(
    (scrambledPuzzle: string, scrambledSolution: string) => {
      onScrambledReady({
        puzzle: scrambledPuzzle,
        solution: scrambledSolution,
      });
    },
    [onScrambledReady]
  );

  const startedGameRef = useRef('');
  const startedSessionRef = useRef('');
  useEffect(() => {
    startedGameRef.current = '';
    startedSessionRef.current = '';
  }, [activeUuid, screenKey]);

  const sessionRequest = useCallback(
    (p: ActivePuzzle, board: string, solution: string) => {
      const level = source === 'level' ? (levelNumber ?? p.level) : p.level;
      if (!level) return null;
      const request: GameStartRequest = {
        board,
        solution,
        level,
        techniques: techniqueBitmaskString(p),
        puzzleType: source,
      };
      const id = source === 'daily' ? p.dailyDate : p.uuid;
      if (id) request.puzzleId = id;
      return request;
    },
    [source, levelNumber]
  );

  useEffect(() => {
    if (!activePuzzle || status !== 'success') return;
    const uuid = activePuzzle.uuid;

    if (isResuming) {
      // Optional (RN): restart the server session for a resumed game.
      if (
        startSessionOnResume &&
        isAuthenticated &&
        startedSessionRef.current !== uuid
      ) {
        const request = sessionRequest(
          activePuzzle,
          activePuzzle.puzzle,
          activePuzzle.solution
        );
        if (request) {
          startedSessionRef.current = uuid;
          void startSession(request);
        }
      }
      return;
    }

    if (!scrambled || scrambled.uuid !== uuid) return;
    if (source === 'daily' && (!activePuzzle.dailyDate || alreadyCompleted)) {
      return;
    }
    if (source === 'level' && levelNumber == null) return;
    if (startedGameRef.current === uuid) return;
    startedGameRef.current = uuid;

    const meta: CurrentGameMeta = {
      boardUuid: uuid,
      ...techniqueFieldsOf(activePuzzle),
    };
    if (source === 'daily' && activePuzzle.dailyDate) {
      meta.dailyDate = activePuzzle.dailyDate;
    }
    if (source === 'level') {
      meta.levelId = String(levelNumber);
      if (levelTitle) meta.levelTitle = levelTitle;
    }
    if (activePuzzle.level !== null) meta.level = activePuzzle.level;
    if (activePuzzle.difficultyScore !== null) {
      meta.difficultyScore = activePuzzle.difficultyScore;
    }
    startGame(
      source,
      {
        original: scrambled.puzzle,
        user: scrambled.puzzle,
        pencilmark: { numbers: '', autopencil: false },
      },
      scrambled.solution,
      meta
    );

    if (isAuthenticated && startedSessionRef.current !== uuid) {
      // The server session gets the board as played (scrambled): hints send
      // that board as `original`, and the API credits a hint to the session
      // only when the two match exactly.
      const request = sessionRequest(
        activePuzzle,
        scrambled.puzzle,
        scrambled.solution
      );
      if (request) {
        startedSessionRef.current = uuid;
        void startSession(request);
      }
    }
  }, [
    activePuzzle,
    status,
    isResuming,
    scrambled,
    source,
    levelNumber,
    levelTitle,
    alreadyCompleted,
    isAuthenticated,
    startSessionOnResume,
    startGame,
    startSession,
    sessionRequest,
  ]);

  // --- Completion ----------------------------------------------------------
  const [achievementResult, setAchievementResult] =
    useState<GameFinishResult | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);

  const onComplete = useCallback(
    async (timeSeconds: number): Promise<GameFinishResult | null> => {
      clearGame();
      let result: GameFinishResult | null = null;
      if (isAuthenticated) {
        result = await finishSession(timeSeconds);
        if (showEmptyAchievement || hasAchievement(result)) {
          setAchievementResult(result);
          setShowAchievement(true);
        }
      }
      if (puzzleId && onPuzzleCompleted && !alreadyCompleted) {
        onPuzzleCompleted({ type: source, id: puzzleId, timeSeconds });
      }
      return result;
    },
    [
      clearGame,
      isAuthenticated,
      finishSession,
      showEmptyAchievement,
      puzzleId,
      onPuzzleCompleted,
      alreadyCompleted,
      source,
    ]
  );

  const closeAchievement = useCallback(() => {
    setShowAchievement(false);
    setAchievementResult(null);
  }, []);

  const discardResume = resume.discard;
  const newGame = useCallback(() => {
    clearGame();
    discardResume();
    excludedUuidRef.current = activeUuid;
    setPinned(null);
    setScrambled(null);
    startedGameRef.current = '';
    startedSessionRef.current = '';
  }, [clearGame, discardResume, activeUuid]);

  // --- Game props ----------------------------------------------------------
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
      scramble: true,
    };
  }, [activePuzzle, resumeGame]);

  return {
    status,
    isReady: resume.isReady,
    isResuming,
    resumeGame,
    activePuzzle,
    gameProps,
    gameKey: activeUuid,
    puzzleId,
    alreadyCompleted,
    isAuthenticated,
    onScrambledReady,
    onBoardReady,
    onProgress: updateProgress,
    onComplete,
    newGame,
    achievementResult,
    showAchievement,
    closeAchievement,
  };
}
