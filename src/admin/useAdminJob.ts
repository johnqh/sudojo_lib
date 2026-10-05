/**
 * Internal: run-state bookkeeping shared by the admin job hooks (progress,
 * capped log, error, running flag, cancellation, token acquisition).
 * Not exported from the package.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { type AdminJobContext, createAdminTokenManager } from './jobs';
import type { AdminApi } from './adminApi';
import {
  type AbortHandle,
  ADMIN_JOB_LOG_LIMIT,
  type AdminJobState,
  createAbortHandle,
} from './types';
import { errorMessage } from './boardStrings';

const INITIAL_STATE: AdminJobState = {
  isRunning: false,
  progress: '',
  log: [],
  error: null,
};

/** Append a line, keeping at most {@link ADMIN_JOB_LOG_LIMIT} lines. */
export function appendLog(log: readonly string[], line: string): string[] {
  const next = [...log, line];
  return next.length > ADMIN_JOB_LOG_LIMIT
    ? next.slice(next.length - ADMIN_JOB_LOG_LIMIT)
    : next;
}

interface ActiveRun {
  id: number;
  abort: AbortHandle;
  /** Cancelled with `detach`: ignore any further output from this run. */
  detached: boolean;
}

export interface AdminJobRunner {
  state: AdminJobState;
  /**
   * Start a run: aborts any previous run, resets state, gets a token, then
   * calls `body` with a job context and an `isLive()` check (false once the
   * run is superseded or detached; gate extra state updates on it). Resolves
   * when the run ends; never rejects.
   */
  run: <T>(
    api: AdminApi,
    getToken: () => Promise<string | null>,
    body: (ctx: AdminJobContext, isLive: () => boolean) => Promise<T>
  ) => Promise<T | undefined>;
  /**
   * Abort the current run. With `detach`, the hook shows "Stopped" and stops
   * running at once, ignoring whatever the run still reports; without it, the
   * run's own final message is shown when it ends.
   */
  cancel: (detach: boolean) => void;
}

export function useAdminJob(): AdminJobRunner {
  const [state, setState] = useState<AdminJobState>(INITIAL_STATE);
  const activeRef = useRef<ActiveRun | null>(null);
  const nextIdRef = useRef(0);

  // Leaving the page stops the job (the web original kept looping).
  useEffect(
    () => () => {
      activeRef.current?.abort.abort();
      activeRef.current = null;
    },
    []
  );

  const run = useCallback<AdminJobRunner['run']>(
    async (api, getToken, body) => {
      activeRef.current?.abort.abort();
      const active: ActiveRun = {
        id: ++nextIdRef.current,
        abort: createAbortHandle(),
        detached: false,
      };
      activeRef.current = active;
      const isLive = () => activeRef.current === active && !active.detached;

      const onProgress = (message: string) => {
        if (!isLive()) return;
        setState(prev => ({
          ...prev,
          progress: message,
          log: appendLog(prev.log, message),
        }));
      };
      const onError = (error: Error) => {
        if (!isLive()) return;
        const line = `Error: ${error.message}`;
        setState(prev => ({
          ...prev,
          progress: line,
          log: appendLog(prev.log, line),
          error: error.message,
        }));
      };

      setState({ isRunning: true, progress: '', log: [], error: null });
      try {
        const token = await createAdminTokenManager(getToken, onProgress);
        if (!token) {
          onError(new Error('Not authenticated'));
          return undefined;
        }
        return await body(
          { api, token, abort: active.abort, onProgress, onError },
          isLive
        );
      } catch (err) {
        onError(err instanceof Error ? err : new Error(errorMessage(err)));
        return undefined;
      } finally {
        if (isLive()) {
          activeRef.current = null;
          setState(prev => ({ ...prev, isRunning: false }));
        }
      }
    },
    []
  );

  const cancel = useCallback((detach: boolean) => {
    const active = activeRef.current;
    if (!active) return;
    active.abort.abort();
    if (detach) {
      active.detached = true;
      activeRef.current = null;
      setState(prev => ({
        ...prev,
        isRunning: false,
        progress: 'Stopped',
        log: appendLog(prev.log, 'Stopped'),
      }));
    }
  }, []);

  return { state, run, cancel };
}
