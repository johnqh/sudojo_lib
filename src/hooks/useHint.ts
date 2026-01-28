/**
 * Hook for getting hints from the Sudoku solver
 *
 * Matches Kotlin HintInteractor behavior:
 * - Stores all hint steps from the API response
 * - Tracks current step index
 * - next() advances to next step (if available)
 * - previous() goes back to previous step
 * - getHint() fetches new hints OR advances to next step if hints exist
 */

import { useCallback, useRef, useState } from 'react';
import {
  type BaseResponse,
  createSudojoClient,
  HintAccessDeniedError,
  type HintAccessUserState,
  type HintEntitlement,
  type SolveData,
  type SolverBoard,
  type SolverHintStep,
} from '@sudobility/sudojo_client';
import type { NetworkClient } from '@sudobility/types';

/** Board data returned when applying a hint */
export interface HintBoardData {
  /** 81-character user input string */
  user: string;
  /** Pencilmarks string (comma-separated) */
  pencilmarks: string | null;
  /** Whether auto-pencilmarks are enabled */
  autoPencilmarks: boolean;
}

/** Data passed to onHintReceived callback */
export interface HintReceivedData {
  /** The first hint step */
  hint: SolverHintStep;
  /** All hint steps */
  hints: SolverHintStep[];
  /** Board data that will be applied */
  boardData: HintBoardData;
}

/** Access denied error info when hint level exceeds subscription tier */
export interface HintAccessError {
  /** The difficulty level of the requested hint */
  hintLevel: number;
  /** The entitlement required to access this hint level */
  requiredEntitlement: HintEntitlement;
  /** The user's current state */
  userState: HintAccessUserState;
}

export interface UseHintOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication */
  token: string;
  /** Original puzzle string (81 chars) */
  puzzle: string;
  /** Current user input string (81 chars) */
  userInput: string;
  /** Current pencilmarks (comma-separated or empty) */
  pencilmarks?: string;
  /** Whether auto-pencilmarks were generated */
  autoPencilmarks?: boolean;
  /**
   * Optional technique number to filter for.
   * When set, will first try to find hints for this specific technique.
   * If no hints found for the target technique, will retry without filter
   * to get the next available hint (allowing puzzle progression).
   */
  techniqueFilter?: number;
  /**
   * Callback fired when hints are received from the API.
   * Use this to intercept hints for logging, saving examples, etc.
   * Called before state is updated.
   */
  onHintReceived?: (data: HintReceivedData) => void;
}

export interface UseHintResult {
  /** Current hint step being displayed */
  hint: SolverHintStep | null;
  /** All hint steps (for showing progress like "Step 1 of 3") */
  hints: SolverHintStep[] | null;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether a hint request is in progress */
  isLoading: boolean;
  /** Error message if hint request failed */
  error: string | null;
  /** Access denied error info when hint level exceeds subscription tier */
  accessError: HintAccessError | null;
  /** Request hints or advance to next step */
  getHint: () => Promise<void>;
  /** Go to next hint step */
  nextStep: () => void;
  /** Go to previous hint step */
  previousStep: () => void;
  /** Clear all hints */
  clearHint: () => void;
  /** Apply the hint to the board - returns board data and clears hint */
  applyHint: () => HintBoardData | null;
  /** Whether there are more steps after current */
  hasNextStep: boolean;
  /** Whether there are steps before current */
  hasPreviousStep: boolean;
  /** Whether the hint can be applied (on last step) */
  canApply: boolean;
  /** Whether the current hint matches the techniqueFilter (if one was set) */
  isTargetTechnique: boolean;
}

/**
 * Hook for getting hints from the solver API
 *
 * Matches Kotlin HintInteractor behavior:
 * - First call to getHint() fetches hints from API
 * - Subsequent calls advance to next step (if available)
 * - Use nextStep()/previousStep() to navigate manually
 * - clearHint() resets everything
 *
 * @param options - Puzzle state for hint generation
 * @returns Hint state and controls
 *
 * @example
 * ```tsx
 * const { hint, isLoading, getHint, nextStep, clearHint, applyHint } = useHint({
 *   networkClient,
 *   baseUrl: 'https://api.sudojo.com',
 *   token: 'user-access-token',
 *   puzzle: originalPuzzle,
 *   userInput: currentInput,
 *   pencilmarks: currentPencilmarks,
 * });
 *
 * // Get hint button
 * <Button onClick={getHint} disabled={isLoading}>Get Hint</Button>
 *
 * // Display hint
 * {hint && <HintDisplay step={hint} />}
 *
 * // Apply hint to board
 * const handleApply = () => {
 *   const boardData = applyHint();
 *   if (boardData) {
 *     setUserInput(boardData.user);
 *     setPencilmarks(boardData.pencilmarks);
 *   }
 * };
 * ```
 */
export function useHint({
  networkClient,
  baseUrl,
  token,
  puzzle,
  userInput,
  pencilmarks,
  autoPencilmarks = false,
  techniqueFilter,
  onHintReceived,
}: UseHintOptions): UseHintResult {
  const [hints, setHints] = useState<SolverHintStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<HintAccessError | null>(null);
  const [isTargetTechnique, setIsTargetTechnique] = useState(false);

  // Track puzzle state to detect when we need to re-fetch
  const lastPuzzleStateRef = useRef<string>('');

  // Store board data from API response for applying hint
  const boardDataRef = useRef<SolverBoard | null>(null);

  // Compute current hint step
  const hint = hints?.[stepIndex] ?? null;
  const totalSteps = hints?.length ?? 0;
  const hasNextStep = stepIndex < totalSteps - 1;
  const hasPreviousStep = stepIndex > 0;
  // Can apply when on last step and have board data
  const canApply =
    hints !== null &&
    stepIndex === totalSteps - 1 &&
    boardDataRef.current !== null;

  // Helper to process a successful hint response
  const processHintResponse = useCallback(
    (response: BaseResponse<SolveData>, isTarget: boolean): boolean => {
      if (response.success && response.data?.hints?.steps?.length) {
        const hintSteps = response.data.hints.steps;
        const board = response.data.board?.board ?? null;

        // Call onHintReceived callback if provided (for interception/logging)
        if (
          onHintReceived &&
          hintSteps[0] &&
          board?.user !== null &&
          board?.user !== undefined
        ) {
          onHintReceived({
            hint: hintSteps[0],
            hints: hintSteps,
            boardData: {
              user: board.user,
              pencilmarks: board.pencilmarks?.pencilmarks ?? null,
              autoPencilmarks: board.pencilmarks?.auto ?? false,
            },
          });
        }

        setHints(hintSteps);
        setStepIndex(0);
        setIsTargetTechnique(isTarget);
        // Store board data for applying hint later (board is nested inside board wrapper)
        boardDataRef.current = board;
        // Track the puzzle state we fetched for
        lastPuzzleStateRef.current = `${puzzle}|${userInput}|${pencilmarks ?? ''}`;
        return true;
      }
      return false;
    },
    [onHintReceived, puzzle, userInput, pencilmarks]
  );

  // Fetch hints from API
  const fetchHints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAccessError(null);
    setIsTargetTechnique(false);

    // Debug: Log the values being sent to the solver
    console.log('[useHint] fetchHints called with:', {
      puzzle: `${puzzle.substring(0, 20)}...`,
      puzzleLength: puzzle.length,
      userInput: `${userInput.substring(0, 20)}...`,
      userInputLength: userInput.length,
      hasPencilmarks: pencilmarks !== undefined,
      autoPencilmarks,
      techniqueFilter,
      hasToken: !!token,
      baseUrl,
    });

    try {
      const client = createSudojoClient(networkClient, baseUrl);

      // Phase 1: If techniqueFilter is set, first try to find that specific technique
      if (techniqueFilter !== undefined) {
        console.log(
          `[useHint] Phase 1: Trying with techniqueFilter=${techniqueFilter}`
        );
        const filteredOptions = {
          original: puzzle,
          user: userInput,
          autoPencilmarks,
          ...(pencilmarks !== undefined && { pencilmarks }),
          techniques: techniqueFilter.toString(),
        };

        const filteredResponse = await client.solverSolve(
          token,
          filteredOptions
        );
        console.log('[useHint] Filtered response:', {
          success: filteredResponse.success,
          hasData: !!filteredResponse.data,
          hasHints: !!filteredResponse.data?.hints,
          hintCount: filteredResponse.data?.hints?.steps?.length,
        });

        // If we found hints for the target technique, use them
        if (processHintResponse(filteredResponse, true)) {
          console.log('[useHint] Found target technique!');
          setIsLoading(false);
          return;
        }

        // No hints for target technique, fall through to Phase 2
        console.log(
          '[useHint] Phase 2: Target technique not found, trying without filter'
        );
      }

      // Phase 2: Regular (unfiltered) call to get next available hint
      const solveOptions = {
        original: puzzle,
        user: userInput,
        autoPencilmarks,
        ...(pencilmarks !== undefined && { pencilmarks }),
      };
      console.log('[useHint] Calling solverSolve (unfiltered)...');
      const response: BaseResponse<SolveData> = await client.solverSolve(
        token,
        solveOptions
      );
      console.log('[useHint] solverSolve response:', {
        success: response.success,
        hasData: !!response.data,
        hasHints: !!response.data?.hints,
        hintCount: response.data?.hints?.steps?.length,
        error: response.error,
      });

      if (processHintResponse(response, false)) {
        // Successfully got hints (not the target technique)
      } else if (response.error) {
        setError(response.error);
        setHints(null);
        boardDataRef.current = null;
      } else {
        setError('No hints available');
        setHints(null);
        boardDataRef.current = null;
      }
    } catch (err) {
      // Debug: Log the error details
      console.error('[useHint] Error in fetchHints:', {
        errorType: err?.constructor?.name,
        errorMessage: err instanceof Error ? err.message : String(err),
        isHintAccessDenied: HintAccessDeniedError.isHintAccessDeniedError(err),
        fullError: err,
      });

      // Handle hint access denied error (402)
      if (HintAccessDeniedError.isHintAccessDeniedError(err)) {
        setAccessError({
          hintLevel: err.hintLevel,
          requiredEntitlement: err.requiredEntitlement,
          userState: err.userState,
        });
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to get hint');
      }
      setHints(null);
      boardDataRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, [
    networkClient,
    baseUrl,
    token,
    puzzle,
    userInput,
    pencilmarks,
    autoPencilmarks,
    techniqueFilter,
    processHintResponse,
  ]);

  // Get hint: fetch if no hints or puzzle changed, otherwise advance
  const getHint = useCallback(async () => {
    const currentPuzzleState = `${puzzle}|${userInput}|${pencilmarks ?? ''}`;

    if (hints === null || lastPuzzleStateRef.current !== currentPuzzleState) {
      // No hints or puzzle state changed - fetch new hints
      await fetchHints();
    } else if (hasNextStep) {
      // Have hints and more steps - advance to next
      setStepIndex(prev => prev + 1);
    }
    // If at last step and hints exist, do nothing (stay on last step)
  }, [hints, hasNextStep, fetchHints, puzzle, userInput, pencilmarks]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (hasNextStep) {
      setStepIndex(prev => prev + 1);
    }
  }, [hasNextStep]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (hasPreviousStep) {
      setStepIndex(prev => prev - 1);
    }
  }, [hasPreviousStep]);

  // Clear all hints
  const clearHint = useCallback(() => {
    setHints(null);
    setStepIndex(0);
    setError(null);
    setAccessError(null);
    setIsTargetTechnique(false);
    lastPuzzleStateRef.current = '';
    boardDataRef.current = null;
  }, []);

  // Apply the hint to the board - returns board data and clears hint
  const applyHint = useCallback((): HintBoardData | null => {
    const board = boardDataRef.current;
    // Check for null/undefined board or user, but allow empty string user
    if (!board || board.user === null || board.user === undefined) {
      return null;
    }

    const result: HintBoardData = {
      user: board.user,
      pencilmarks: board.pencilmarks?.pencilmarks ?? null,
      autoPencilmarks: board.pencilmarks?.auto ?? false,
    };

    // Clear hints after applying (matches Kotlin: result = null)
    setHints(null);
    setStepIndex(0);
    setError(null);
    lastPuzzleStateRef.current = '';
    boardDataRef.current = null;

    return result;
  }, []);

  return {
    hint,
    hints,
    stepIndex,
    totalSteps,
    isLoading,
    error,
    accessError,
    getHint,
    nextStep,
    previousStep,
    clearHint,
    applyHint,
    hasNextStep,
    hasPreviousStep,
    canApply,
    isTargetTechnique,
  };
}
