/**
 * Game Timer Hook - Track elapsed time during gameplay
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTime } from '../utils/time';

export interface UseGameTimerResult {
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Formatted time string (MM:SS or HH:MM:SS) */
  formattedTime: string;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Start the timer */
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
 * @param options - Timer options
 * @returns Timer state and controls
 *
 * @example
 * ```tsx
 * const { elapsedSeconds, formattedTime, isRunning, start, pause, stop } = useGameTimer({ autoStart: true });
 *
 * // Display: <span>{formattedTime}</span>
 * // On completion: const finalTime = stop();
 * ```
 */
export function useGameTimer(
  options: UseGameTimerOptions = {}
): UseGameTimerResult {
  const { autoStart = false, initialTime = 0 } = options;

  const [elapsedSeconds, setElapsedSeconds] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null
  );

  // Timer tick effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = globalThis.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        globalThis.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setElapsedSeconds(0);
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
    setElapsedSeconds(0);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    return elapsedSeconds;
  }, [elapsedSeconds]);

  return {
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    isRunning,
    start,
    pause,
    resume,
    reset,
    stop,
  };
}
