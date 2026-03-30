/**
 * Shared hook for reporting game progress to a parent component.
 *
 * Handles three reporting triggers:
 * 1. On board state change (input, pencilmarks, pencil mode, auto-pencilmarks)
 * 2. Periodic interval (every 1s for timer updates)
 * 3. Flush on pause transition (ensure state is saved before backgrounding)
 *
 * Used by SudokuGame on both web and React Native.
 */

import { useEffect, useRef } from 'react';

export type ProgressUpdateCallback = (
  inputString: string,
  pencilmarksString: string,
  isPencilMode: boolean,
  autoPencilmarks: boolean,
  elapsedTime: number
) => void;

export interface UseProgressReporterOptions {
  /** Whether the board is loaded */
  hasBoard: boolean;
  /** Whether the game is completed */
  isCompleted: boolean;
  /** Whether the game is paused */
  paused?: boolean;
  /** Callback to report progress */
  onProgressUpdate?: ProgressUpdateCallback;
  /** Get current input string from the board */
  getInputString: () => string;
  /** Get current pencilmarks string from the board */
  getPencilmarksString: () => string;
  /** Whether pencil mode is active */
  isPencilMode: boolean;
  /** Whether auto-pencilmarks is enabled */
  autoPencilmarks: boolean;
  /** Get current elapsed seconds */
  getElapsedSeconds: () => number;
}

export function useProgressReporter({
  hasBoard,
  isCompleted,
  paused,
  onProgressUpdate,
  getInputString,
  getPencilmarksString,
  isPencilMode,
  autoPencilmarks,
  getElapsedSeconds,
}: UseProgressReporterOptions): void {
  // Report on board state changes
  useEffect(() => {
    if (!hasBoard || !onProgressUpdate || isCompleted) return;
    onProgressUpdate(
      getInputString(),
      getPencilmarksString(),
      isPencilMode,
      autoPencilmarks,
      getElapsedSeconds()
    );
  }, [
    hasBoard,
    isPencilMode,
    isCompleted,
    onProgressUpdate,
    getInputString,
    getPencilmarksString,
    autoPencilmarks,
    getElapsedSeconds,
  ]);

  // Flush progress when transitioning to paused
  const prevPausedRef = useRef(paused);
  useEffect(() => {
    const wasPaused = prevPausedRef.current;
    prevPausedRef.current = paused;
    if (paused && !wasPaused && onProgressUpdate && hasBoard && !isCompleted) {
      onProgressUpdate(
        getInputString(),
        getPencilmarksString(),
        isPencilMode,
        autoPencilmarks,
        getElapsedSeconds()
      );
    }
  }, [
    paused,
    onProgressUpdate,
    hasBoard,
    isCompleted,
    getInputString,
    getPencilmarksString,
    isPencilMode,
    autoPencilmarks,
    getElapsedSeconds,
  ]);

  // Periodic save interval (1s)
  useEffect(() => {
    if (!onProgressUpdate || !hasBoard || isCompleted || paused) return;
    const id = globalThis.setInterval(() => {
      onProgressUpdate(
        getInputString(),
        getPencilmarksString(),
        isPencilMode,
        autoPencilmarks,
        getElapsedSeconds()
      );
    }, 1000);
    return () => globalThis.clearInterval(id);
  }, [
    onProgressUpdate,
    hasBoard,
    isCompleted,
    paused,
    getInputString,
    getPencilmarksString,
    isPencilMode,
    autoPencilmarks,
    getElapsedSeconds,
  ]);
}
