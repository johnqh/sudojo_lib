/**
 * Shared hook for tracking the current hint step index.
 *
 * Provides both a ref (for reading the latest value in callbacks without
 * stale closures) and state (for triggering re-renders when the step changes,
 * e.g. to recreate a share config in a useMemo).
 *
 * Used by game screens on both web and React Native to keep hint step
 * tracking consistent across platforms.
 */

import { type RefObject, useCallback, useRef, useState } from 'react';

export interface UseHintStepTrackerResult {
  /** Current hint step as React state (triggers re-renders). */
  hintStep: number | null;
  /** Ref holding the latest hint step (safe to read in callbacks). */
  hintStepRef: RefObject<number | null>;
  /** Callback to pass to SudokuGame's `onHintStepChange` prop. */
  handleHintStepChange: (step: number | null) => void;
}

export function useHintStepTracker(): UseHintStepTrackerResult {
  const hintStepRef = useRef<number | null>(null);
  const [hintStep, setHintStep] = useState<number | null>(null);

  const handleHintStepChange = useCallback((step: number | null) => {
    hintStepRef.current = step;
    setHintStep(step);
  }, []);

  return { hintStep, hintStepRef, handleHintStepChange };
}
