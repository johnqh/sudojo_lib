/**
 * Shared hook for auto-triggering hints when loading from a shared link or deep link.
 *
 * Handles three concerns:
 * 1. Waiting for initial input/pencilmarks to be applied before triggering hint
 * 2. Auto-triggering getHint() when initialHintStep is set
 * 3. Advancing through hint steps to reach the target step
 * 4. Notifying parent when hint step changes
 *
 * Used by SudokuGame on both web and React Native.
 */

import { useEffect, useRef } from 'react';
import type { SolverHintStep } from '@sudobility/sudojo_types';

export interface UseAutoHintOptions {
  /** Target hint step to restore (0-based), or undefined if no hint */
  initialHintStep?: number;
  /** Initial user input string expected on the board (from shared link) */
  initialInput?: string;
  /** Initial pencilmarks string expected on the board (from shared link) */
  initialPencilmarks?: string;
  /** Current input string from the board (to detect when resume data is applied) */
  boardInputString: string;
  /** Current pencilmarks string from the board */
  boardPencilmarksString: string;
  /** Whether the board is ready (loaded and has 81 cells) */
  isBoardReady: boolean;
  /** Current hint step object (null when no hint is showing) */
  hint: SolverHintStep | null;
  /** All hint steps (null when no hints loaded) */
  hints: SolverHintStep[] | null;
  /** Current step index within hints */
  stepIndex: number;
  /** Whether there's a next step available */
  hasNextStep: boolean;
  /** Deselect current cell */
  deselectCell: () => void;
  /** Trigger hint fetch */
  getHint: () => void;
  /** Advance to next hint step */
  nextStep: () => void;
  /** Callback to notify parent of hint step changes */
  onHintStepChange?: (stepIndex: number | null) => void;
}

export function useAutoHint({
  initialHintStep,
  initialInput,
  initialPencilmarks,
  boardInputString,
  boardPencilmarksString,
  isBoardReady,
  hint,
  hints,
  stepIndex,
  hasNextStep,
  deselectCell,
  getHint,
  nextStep,
  onHintStepChange,
}: UseAutoHintOptions): void {
  // Wait until initial input/pencilmarks have been applied so the hint API gets correct state.
  // We check the actual board data rather than a flag because the dispatch from applyHintData
  // is processed asynchronously — the board won't reflect the data until the next render.
  const resumeDataApplied =
    (!initialInput || boardInputString === initialInput) &&
    (!initialPencilmarks || boardPencilmarksString === initialPencilmarks);

  // Auto-trigger hint when board is ready and resume data is applied
  const initialHintAppliedRef = useRef(false);
  useEffect(() => {
    if (
      initialHintStep != null &&
      initialHintStep >= 0 &&
      !initialHintAppliedRef.current &&
      isBoardReady &&
      resumeDataApplied
    ) {
      initialHintAppliedRef.current = true;
      deselectCell();
      getHint();
    }
  }, [initialHintStep, isBoardReady, deselectCell, getHint, resumeDataApplied]);

  // Once hints are loaded, advance to the target step
  useEffect(() => {
    if (
      initialHintStep != null &&
      initialHintStep > 0 &&
      hints != null &&
      stepIndex < initialHintStep &&
      hasNextStep
    ) {
      nextStep();
    }
  }, [initialHintStep, hints, stepIndex, hasNextStep, nextStep]);

  // Notify parent when hint step changes
  useEffect(() => {
    onHintStepChange?.(hint ? stepIndex : null);
  }, [hint, stepIndex, onHintStepChange]);
}
