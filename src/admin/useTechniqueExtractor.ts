/**
 * Admin: fill in the techniques bitmask and level of boards that lack them.
 */

import { useCallback, useRef, useState } from 'react';
import { useAdminApi } from './adminApi';
import { runTechniqueExtraction } from './jobs';
import type { AdminJobOptions, AdminJobState } from './types';
import { useAdminJob } from './useAdminJob';

export type UseTechniqueExtractorOptions = AdminJobOptions;

export interface UseTechniqueExtractorResult extends AdminJobState {
  /** Boards saved by the current/last run. */
  extractedCount: number;
  /**
   * Start extracting. `testWithFrontend`: walk each board with /solve and
   * compare with /validate (stops on a mismatch) instead of trusting
   * /validate. Resolves with the number saved when the run ends.
   */
  start: (options: { testWithFrontend: boolean }) => Promise<number>;
  /** Stop now: shows "Stopped" and ignores the board in flight. */
  cancel: () => void;
}

/**
 * Process boards without techniques until none are left, `cancel()`, or a
 * critical error. Board counts refresh on their own (each save invalidates
 * sudojo_client's `boards` queries).
 */
export function useTechniqueExtractor(
  options: UseTechniqueExtractorOptions
): UseTechniqueExtractorResult {
  const api = useAdminApi(options.networkClient, options.baseUrl);
  const job = useAdminJob();
  const [extractedCount, setExtractedCount] = useState(0);
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;

  const { run, cancel: cancelJob } = job;

  const start = useCallback(
    async ({ testWithFrontend }: { testWithFrontend: boolean }) => {
      setExtractedCount(0);
      const count = await run(
        api,
        () => getTokenRef.current(),
        (ctx, isLive) => {
          ctx.onProgress('Starting extraction...');
          return runTechniqueExtraction(ctx, {
            testWithFrontend,
            onBoardExtracted: () => {
              if (isLive()) setExtractedCount(n => n + 1);
            },
          });
        }
      );
      return count ?? 0;
    },
    [api, run]
  );

  const cancel = useCallback(() => cancelJob(true), [cancelJob]);

  return { ...job.state, extractedCount, start, cancel };
}
