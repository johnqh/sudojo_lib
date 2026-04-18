/**
 * Hint action event system for external control of the hint UI.
 *
 * Used by deep links (e.g., sudojo:///en/action/hint) to trigger hint actions
 * on the currently active SudokuGame without navigating to a new screen.
 *
 * Flow:
 * 1. Deep link handler calls `emitHintAction()`
 * 2. The active SudokuGame's `useHintActionListener` receives the event
 * 3. It calls getHint() or nextStep() as appropriate
 * 4. After processing, it calls the status callback so the emitter knows
 *    what happened (e.g., hint completed, step advanced)
 */

import { useCallback, useEffect, useRef } from 'react';

/** Status reported back after a hint action is processed */
export interface HintActionStatus {
  /** Whether a hint is currently showing */
  hintActive: boolean;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether there are more steps */
  hasNextStep: boolean;
  /** Whether the hint has been fully stepped through (on last step, no more next) */
  completed: boolean;
}

type HintActionListener = () => void;
type HintStatusListener = (status: HintActionStatus) => void;

/** Registered action listeners (from active SudokuGame instances) */
const actionListeners = new Set<HintActionListener>();

/** Registered status listeners (from the script/caller waiting for results) */
const statusListeners = new Set<HintStatusListener>();

/**
 * Emit a hint action event. The active SudokuGame will receive this
 * and trigger getHint() or nextStep().
 */
export function emitHintAction(): void {
  for (const listener of actionListeners) {
    listener();
  }
}

/**
 * Report hint status back to any listeners (e.g., the recording script).
 */
export function reportHintStatus(status: HintActionStatus): void {
  for (const listener of statusListeners) {
    listener(status);
  }
}

/**
 * Subscribe to hint status updates.
 * Returns an unsubscribe function.
 */
export function onHintStatus(listener: HintStatusListener): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/**
 * Hook for SudokuGame to listen for external hint action events.
 *
 * When an event is received:
 * - If no hint is showing, calls getHint()
 * - If hint is showing and has next step, calls nextStep()
 * - Reports status back via reportHintStatus()
 */
export function useHintActionListener({
  hint,
  hints,
  stepIndex,
  totalSteps,
  hasNextStep,
  canApply,
  getHint,
  nextStep,
  applyHint,
  deselectCell,
}: {
  hint: unknown | null;
  hints: unknown[] | null;
  stepIndex: number;
  totalSteps: number;
  hasNextStep: boolean;
  canApply: boolean;
  getHint: () => void;
  nextStep: () => void;
  applyHint: () => void;
  deselectCell: () => void;
}): void {
  // Use refs to avoid stale closures in the listener
  const stateRef = useRef({
    hint,
    hints,
    stepIndex,
    totalSteps,
    hasNextStep,
    canApply,
  });
  stateRef.current = {
    hint,
    hints,
    stepIndex,
    totalSteps,
    hasNextStep,
    canApply,
  };

  const actionsRef = useRef({ getHint, nextStep, applyHint, deselectCell });
  actionsRef.current = { getHint, nextStep, applyHint, deselectCell };

  // Track if we just triggered an action and need to report status after state updates
  const pendingStatusRef = useRef(false);

  const handleAction = useCallback(() => {
    const { hint: h, hasNextStep: hasNext, canApply: canDo } = stateRef.current;
    const {
      getHint: doGetHint,
      nextStep: doNextStep,
      applyHint: doApply,
      deselectCell: doDeselect,
    } = actionsRef.current;

    if (h === null) {
      // No hint showing — trigger hint fetch
      doDeselect();
      doGetHint();
    } else if (hasNext) {
      // Hint showing, advance to next step
      doNextStep();
    } else if (canDo) {
      // On last step — apply the hint
      doApply();
    }

    pendingStatusRef.current = true;
  }, []);

  // Register/unregister the action listener
  useEffect(() => {
    actionListeners.add(handleAction);
    return () => {
      actionListeners.delete(handleAction);
    };
  }, [handleAction]);

  // Report status whenever hint state changes after an action
  useEffect(() => {
    if (pendingStatusRef.current) {
      pendingStatusRef.current = false;
      reportHintStatus({
        hintActive: hint !== null,
        stepIndex,
        totalSteps,
        hasNextStep,
        completed: hint !== null && !hasNextStep,
      });
    }
  }, [hint, stepIndex, totalSteps, hasNextStep]);
}
