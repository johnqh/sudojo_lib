/**
 * Hook for integrating the Sudoku solver for teaching and hints
 */

import { useCallback, useMemo, useState } from 'react';
import type { NetworkClient } from '@sudobility/types';
import {
  type BaseResponse,
  createSudojoClient,
  type SolveData,
  type SolverHintStep,
  type SudojoAuth,
  type SudojoConfig,
} from '@sudobility/sudojo_client';
import type { GameHint, TeachingState } from '../types';

export interface UseGameTeachingOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Authentication for API calls */
  auth: SudojoAuth;
}

export interface UseGameTeachingResult {
  /** Current teaching state */
  teachingState: TeachingState;
  /** Get a hint for the current board state */
  getHint: (
    originalPuzzle: string,
    userBoard: string,
    options?: { autoPencilmarks?: boolean; pencilmarks?: string }
  ) => Promise<void>;
  /** Apply the current hint to the board (returns the action to perform) */
  applyHint: () => GameHint | null;
  /** Move to the next step in a multi-step hint */
  nextStep: () => void;
  /** Move to the previous step in a multi-step hint */
  previousStep: () => void;
  /** Clear the current hint */
  clearHint: () => void;
  /** Whether a hint is available */
  hasHint: boolean;
  /** Whether there are more steps in the current hint */
  hasMoreSteps: boolean;
  /** Whether we can go to previous step */
  hasPreviousStep: boolean;
}

/**
 * Converts a solver SolverHintStep to our GameHint format
 */
function convertHintStep(step: SolverHintStep): GameHint {
  return {
    title: step.title,
    text: step.text,
    cells:
      step.cells?.map(cell => {
        const action: {
          select?: number;
          addPencilmarks?: number[];
          removePencilmarks?: number[];
        } = {};
        if (cell.actions.select) {
          action.select = parseInt(cell.actions.select, 10);
        }
        if (cell.actions.add) {
          action.addPencilmarks = cell.actions.add
            .split('')
            .map(d => parseInt(d, 10));
        }
        if (cell.actions.remove) {
          action.removePencilmarks = cell.actions.remove
            .split('')
            .map(d => parseInt(d, 10));
        }
        return {
          row: cell.row,
          column: cell.column,
          color: cell.color,
          ...(Object.keys(action).length > 0 ? { action } : {}),
        };
      }) ?? [],
    areas:
      step.areas?.map(area => ({
        type: area.type,
        index: area.index,
        color: area.color,
      })) ?? [],
  };
}

/**
 * Hook for teaching/hint functionality using the solver API
 *
 * @param options - Hook options
 * @returns Teaching state and actions
 *
 * @example
 * ```tsx
 * function GameWithHints() {
 *   const game = useGame();
 *   const { teachingState, getHint, applyHint } = useGameTeaching({
 *     networkClient,
 *     config: { baseUrl: 'https://api.sudojo.com' },
 *     auth: { accessToken: 'user-access-token' },
 *   });
 *
 *   const handleGetHint = async () => {
 *     await getHint(
 *       game.getOriginalPuzzle(),
 *       game.getBoardString(),
 *       { autoPencilmarks: game.state.settings.autoPencilmarks }
 *     );
 *   };
 *
 *   const handleApplyHint = () => {
 *     const hint = applyHint();
 *     if (hint) {
 *       // Apply the hint actions to the game
 *       for (const cell of hint.cells) {
 *         if (cell.action?.select) {
 *           game.selectCell(cell.row, cell.column);
 *           game.setValue(cell.action.select);
 *         }
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <Board cells={game.state.board} />
 *       <button onClick={handleGetHint}>Get Hint</button>
 *       {teachingState.currentHint && (
 *         <div>
 *           <h3>{teachingState.currentHint.title}</h3>
 *           <p>{teachingState.currentHint.text}</p>
 *           <button onClick={handleApplyHint}>Apply</button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGameTeaching(
  options: UseGameTeachingOptions
): UseGameTeachingResult {
  const { networkClient, config, auth } = options;

  const [teachingState, setTeachingState] = useState<TeachingState>({
    isActive: false,
    currentHint: null,
    currentStep: 0,
    totalSteps: 0,
    isLoading: false,
    error: null,
  });

  // Store all hint steps for multi-step hints
  const [allSteps, setAllSteps] = useState<GameHint[]>([]);

  // Create Sudojo client
  const client = useMemo(() => {
    return createSudojoClient(networkClient, config);
  }, [networkClient, config]);

  const getHint = useCallback(
    async (
      originalPuzzle: string,
      userBoard: string,
      hintOptions?: { autoPencilmarks?: boolean; pencilmarks?: string }
    ) => {
      setTeachingState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const solveOptions: {
          original: string;
          user: string;
          autoPencilmarks?: boolean;
          pencilmarks?: string;
        } = {
          original: originalPuzzle,
          user: userBoard,
        };
        if (hintOptions?.autoPencilmarks !== undefined) {
          solveOptions.autoPencilmarks = hintOptions.autoPencilmarks;
        }
        if (hintOptions?.pencilmarks !== undefined) {
          solveOptions.pencilmarks = hintOptions.pencilmarks;
        }
        const response: BaseResponse<SolveData> = await client.solverSolve(
          auth,
          solveOptions
        );

        if (!response.success || !response.data?.hints?.steps?.length) {
          const errorMessage =
            response.error ?? 'No hints available for the current state';
          setTeachingState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
            isActive: false,
            currentHint: null,
            currentStep: 0,
            totalSteps: 0,
          }));
          setAllSteps([]);
          return;
        }

        const hintSteps = response.data.hints.steps;
        const convertedSteps = hintSteps.map(convertHintStep);

        if (convertedSteps.length === 0) {
          setTeachingState(prev => ({
            ...prev,
            isLoading: false,
            error: 'No hints available',
            isActive: false,
            currentHint: null,
            currentStep: 0,
            totalSteps: 0,
          }));
          setAllSteps([]);
          return;
        }

        setAllSteps(convertedSteps);
        setTeachingState({
          isActive: true,
          currentHint: convertedSteps[0] ?? null,
          currentStep: 0,
          totalSteps: convertedSteps.length,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get hint';
        setTeachingState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          isActive: false,
          currentHint: null,
          currentStep: 0,
          totalSteps: 0,
        }));
        setAllSteps([]);
      }
    },
    [client, auth]
  );

  const applyHint = useCallback((): GameHint | null => {
    return teachingState.currentHint;
  }, [teachingState.currentHint]);

  const nextStep = useCallback(() => {
    if (teachingState.currentStep < teachingState.totalSteps - 1) {
      const nextStepIndex = teachingState.currentStep + 1;
      setTeachingState(prev => ({
        ...prev,
        currentStep: nextStepIndex,
        currentHint: allSteps[nextStepIndex] ?? null,
      }));
    }
  }, [teachingState.currentStep, teachingState.totalSteps, allSteps]);

  const previousStep = useCallback(() => {
    if (teachingState.currentStep > 0) {
      const prevStepIndex = teachingState.currentStep - 1;
      setTeachingState(prev => ({
        ...prev,
        currentStep: prevStepIndex,
        currentHint: allSteps[prevStepIndex] ?? null,
      }));
    }
  }, [teachingState.currentStep, allSteps]);

  const clearHint = useCallback(() => {
    setTeachingState({
      isActive: false,
      currentHint: null,
      currentStep: 0,
      totalSteps: 0,
      isLoading: false,
      error: null,
    });
    setAllSteps([]);
  }, []);

  const hasHint = useMemo(
    () => teachingState.isActive && teachingState.currentHint !== null,
    [teachingState.isActive, teachingState.currentHint]
  );

  const hasMoreSteps = useMemo(
    () => teachingState.currentStep < teachingState.totalSteps - 1,
    [teachingState.currentStep, teachingState.totalSteps]
  );

  const hasPreviousStep = useMemo(
    () => teachingState.currentStep > 0,
    [teachingState.currentStep]
  );

  return {
    teachingState,
    getHint,
    applyHint,
    nextStep,
    previousStep,
    clearHint,
    hasHint,
    hasMoreSteps,
    hasPreviousStep,
  };
}
