/**
 * Hook for integrating the Sudoku solver for teaching and hints
 */

import { useCallback, useMemo, useState } from 'react';
import type { NetworkClient } from '@sudobility/types';
import {
  createSudojoSolverClient,
  type ClientConfig,
  type HintStep,
  type SolveResponse,
} from '@sudobility/sudojo_solver_client';
import type { GameHint, TeachingState } from '../types';

export interface UseGameTeachingOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Solver API configuration */
  config: ClientConfig;
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
 * Converts a solver HintStep to our GameHint format
 */
function convertHintStep(step: HintStep): GameHint {
  return {
    title: step.title,
    text: step.text,
    cells:
      step.cells?.map(cell => ({
        row: cell.row,
        column: cell.column,
        color: cell.color,
        action: {
          select: cell.actions.select ? parseInt(cell.actions.select, 10) : undefined,
          addPencilmarks: cell.actions.add
            ? cell.actions.add.split('').map(d => parseInt(d, 10))
            : undefined,
          removePencilmarks: cell.actions.remove
            ? cell.actions.remove.split('').map(d => parseInt(d, 10))
            : undefined,
        },
      })) ?? [],
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
 *     config: { baseUrl: 'https://solver.sudojo.com' },
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
export function useGameTeaching(options: UseGameTeachingOptions): UseGameTeachingResult {
  const { networkClient, config } = options;

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

  // Create solver client
  const solverClient = useMemo(() => {
    return createSudojoSolverClient(networkClient, config);
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
        const response: SolveResponse = await solverClient.solve({
          original: originalPuzzle,
          user: userBoard,
          autoPencilmarks: hintOptions?.autoPencilmarks,
          pencilmarks: hintOptions?.pencilmarks,
        });

        if (!response.success || !response.data?.hints) {
          const errorMessage =
            response.error?.message ?? 'No hints available for the current state';
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

        const hints = response.data.hints;
        const convertedSteps = hints.steps.map(convertHintStep);

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
        const errorMessage = err instanceof Error ? err.message : 'Failed to get hint';
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
    [solverClient]
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
