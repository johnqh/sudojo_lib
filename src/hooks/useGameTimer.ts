/**
 * Game Timer Hook - Track elapsed time during gameplay
 *
 * Uses a ref for elapsed seconds to avoid re-rendering the parent
 * component every second. Components that need to display the time
 * should use their own interval to read from elapsedRef.
 */

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseGameTimerResult {
  /** Ref holding the current elapsed seconds (does not trigger re-renders) */
  elapsedRef: RefObject<number>;
  /** Get current elapsed seconds */
  getElapsedSeconds: () => number;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Start the timer (resets to 0) */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Reset the timer */
  reset: () => void;
  /** Stop the timer (pause and return final time) */
  stop: () => number;
}

export interface UseGameTimerOptions {
  /** Auto-start timer on mount */
  autoStart?: boolean;
  /** Initial time in seconds */
  initialTime?: number;
}

/**
 * Hook for game timer functionality
 *
 * Elapsed time is tracked in a ref to avoid causing re-renders every second.
 * Use `elapsedRef` in display components that manage their own update interval.
 * Use `getElapsedSeconds()` to read the current time in event handlers.
 *
 * @param options - Timer options
 * @returns Timer state and controls
 *
 * @example
 * ```tsx
 * const { elapsedRef, getElapsedSeconds, isRunning, stop } = useGameTimer({ autoStart: true });
 *
 * // Pass to self-updating GameTimer component:
 * <GameTimer elapsedRef={elapsedRef} isRunning={isRunning} />
 *
 * // Read time in handlers:
 * const finalTime = stop();
 * ```
 */
export function useGameTimer(
  options: UseGameTimerOptions = {}
): UseGameTimerResult {
  const { autoStart = false, initialTime = 0 } = options;

  const elapsedRef = useRef(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null
  );

  // Timer tick effect — only updates the ref, no state change
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = globalThis.setInterval(() => {
        elapsedRef.current = (elapsedRef.current ?? 0) + 1;
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        globalThis.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const getElapsedSeconds = useCallback(() => elapsedRef.current ?? 0, []);

  const start = useCallback(() => {
    elapsedRef.current = 0;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    elapsedRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    return elapsedRef.current ?? 0;
  }, []);

  return {
    elapsedRef,
    getElapsedSeconds,
    isRunning,
    start,
    pause,
    resume,
    reset,
    stop,
  };
}
