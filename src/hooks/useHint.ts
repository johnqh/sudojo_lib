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

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  BaseResponse,
  HintAccessUserState,
  HintEntitlement,
  SolveData,
  SolverBoard,
  SolverHintStep,
} from '@sudobility/sudojo_types';
import {
  hasRequiredEntitlement,
  parseEntitlements,
} from '@sudobility/sudojo_types';
import {
  createSudojoClient,
  HintAccessDeniedError,
} from '@sudobility/sudojo_client';
import type { NetworkClient } from '@sudobility/types';

/** Number of hint steps shown for free before paywall */
const FREE_HINT_STEP_LIMIT = 2;

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
  /** Difficulty level for this hint (from SolverHints.level) */
  hintLevel: number;
  /** Technique ID for this hint (from SolverHints.technique) */
  hintTechnique: number;
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
  /**
   * The user's active entitlement IDs (e.g., ['blue_belt'] or ['red_belt']).
   * Used for client-side hint step gating.
   */
  userEntitlements?: string[];
  /**
   * The entitlement field from the current level (e.g., "blue_belt,red_belt").
   * If null/empty, the level is free and all hint steps are visible.
   */
  levelEntitlement?: string | null;
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
  /** Whether the hint has steps gated behind a paywall */
  isHintGated: boolean;
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
  userEntitlements,
  levelEntitlement,
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

  // Store the hint level from the API response for entitlement checking
  const hintLevelRef = useRef<number>(0);

  // Client-side entitlement check: does the user have access to this hint's level?
  const hasAccess = useMemo(
    () => hasRequiredEntitlement(levelEntitlement, userEntitlements ?? []),
    [levelEntitlement, userEntitlements]
  );

  // Compute current hint step
  const hint = hints?.[stepIndex] ?? null;
  const totalSteps = hints?.length ?? 0;
  const isHintGated = !hasAccess && totalSteps > FREE_HINT_STEP_LIMIT;
  const maxVisibleStep = hasAccess ? totalSteps - 1 : FREE_HINT_STEP_LIMIT - 1;
  const hasNextStep = stepIndex < Math.min(totalSteps - 1, maxVisibleStep);
  const hasPreviousStep = stepIndex > 0;
  // Can apply when on last step (of all steps) and have board data and have access
  const canApply =
    hints !== null &&
    stepIndex === totalSteps - 1 &&
    hasAccess &&
    boardDataRef.current !== null;

  // Helper to process a successful hint response
  const processHintResponse = useCallback(
    (response: BaseResponse<SolveData>, isTarget: boolean): boolean => {
      if (response.success && response.data?.hints?.steps?.length) {
        const hintSteps = response.data.hints.steps;
        const board = response.data.board ?? null;

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
              pencilmarks: board.pencilmark?.numbers ?? null,
              autoPencilmarks: board.pencilmark?.autopencil ?? false,
            },
            hintLevel: response.data.hints.level,
            hintTechnique: response.data.hints.technique,
          });
        }

        setHints(hintSteps);
        setStepIndex(0);
        setIsTargetTechnique(isTarget);
        // Store board data for applying hint later
        boardDataRef.current = board;
        // Store hint level for entitlement checking
        hintLevelRef.current = response.data.hints.level;
        // Track the puzzle state we fetched for
        lastPuzzleStateRef.current = `${puzzle}|${userInput}|${pencilmarks ?? ''}`;

        // If user doesn't have access and there are more than FREE_HINT_STEP_LIMIT steps,
        // set access error so UI can show paywall after the free steps
        if (!hasAccess && hintSteps.length > FREE_HINT_STEP_LIMIT) {
          const required = parseEntitlements(levelEntitlement);
          setAccessError({
            hintLevel: response.data.hints.level,
            requiredEntitlement: required[0] ?? 'blue_belt',
            userState:
              (userEntitlements?.length ?? 0) > 0
                ? 'insufficient_tier'
                : 'no_subscription',
          });
        }

        return true;
      }
      return false;
    },
    [
      onHintReceived,
      puzzle,
      userInput,
      pencilmarks,
      hasAccess,
      levelEntitlement,
      userEntitlements,
    ]
  );

  // Fetch hints from API
  const fetchHints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAccessError(null);
    setIsTargetTechnique(false);

    try {
      const client = createSudojoClient(networkClient, baseUrl);

      // Phase 1: If techniqueFilter is set, first try to find that specific technique
      if (techniqueFilter !== undefined) {
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

        // If we found hints for the target technique, use them
        if (processHintResponse(filteredResponse, true)) {
          setIsLoading(false);
          return;
        }
        // No hints for target technique, fall through to Phase 2
      }

      // Phase 2: Regular (unfiltered) call to get next available hint
      const solveOptions = {
        original: puzzle,
        user: userInput,
        autoPencilmarks,
        ...(pencilmarks !== undefined && { pencilmarks }),
      };
      const response: BaseResponse<SolveData> = await client.solverSolve(
        token,
        solveOptions
      );

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
      pencilmarks: board.pencilmark?.numbers ?? null,
      autoPencilmarks: board.pencilmark?.autopencil ?? false,
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
    isHintGated,
  };
}
