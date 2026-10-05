/**
 * Shared types for the admin batch jobs (board generation, technique
 * extraction, example creation).
 *
 * Ported from `sudojo_app/src/utils/admin/types.ts`.
 */

import type { NetworkClient } from '@sudobility/types';

/** Options every admin job hook takes. */
export interface AdminJobOptions {
  networkClient: NetworkClient;
  baseUrl: string;
  /**
   * Returns a valid admin ID token, or null when signed out. Called once when a
   * job starts and again every {@link ADMIN_TOKEN_REFRESH_INTERVAL} boards, so
   * a long job survives token expiry. Pass a function that forces a refresh
   * (e.g. Firebase `getIdToken(true)`) or that falls back to the current token.
   */
  getToken: () => Promise<string | null>;
}

/** Cooperative cancellation flag shared by a running job. */
export interface AbortHandle {
  shouldAbort: () => boolean;
  abort: () => void;
}

/** Create a fresh, not-yet-aborted {@link AbortHandle}. */
export function createAbortHandle(): AbortHandle {
  let aborted = false;
  return {
    shouldAbort: () => aborted,
    abort: () => {
      aborted = true;
    },
  };
}

/** Refresh the admin token every N boards during a long job. */
export const ADMIN_TOKEN_REFRESH_INTERVAL = 50;

/** Most recent log lines a job hook keeps (older lines are dropped). */
export const ADMIN_JOB_LOG_LIMIT = 200;

/** State every admin job hook exposes. */
export interface AdminJobState {
  /** True from `start` until the job finishes or is cancelled. */
  isRunning: boolean;
  /** Latest progress line ('' before the first run). */
  progress: string;
  /** Progress lines of the current run, oldest first, capped at {@link ADMIN_JOB_LOG_LIMIT}. */
  log: string[];
  /** Last error message of the current run, or null. */
  error: string | null;
}
