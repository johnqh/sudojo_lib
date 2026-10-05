/**
 * Fire a callback once each time a puzzle becomes completed.
 *
 * Shared latch from the web and RN SudokuGame (and the extension side panel):
 * `onComplete` runs on the false -> true transition of `isCompleted`, never
 * again while it stays true, and the latch re-arms when `isCompleted` goes
 * back to false (a new board, an undo), as in the apps' game components.
 */

import { useEffect, useRef } from 'react';

/**
 * @param isCompleted - Whether the puzzle is currently completed
 * @param onComplete - Called once per completion (latest callback is used)
 *
 * @example
 * ```tsx
 * useCompletionTrigger(isCompleted, () => {
 *   const finalTime = stopTimer();
 *   setShowCelebration(true);
 *   onComplete?.(finalTime);
 * });
 * ```
 */
export function useCompletionTrigger(
  isCompleted: boolean,
  onComplete: () => void
): void {
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    if (isCompleted && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    } else if (!isCompleted) {
      completedRef.current = false;
    }
  }, [isCompleted]);
}
