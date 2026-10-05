/**
 * Admin: create technique examples (each with a linked practice).
 */

import type { TechniqueId } from '@sudobility/sudojo_types';
import { useCallback, useRef, useState } from 'react';
import { useAdminApi } from './adminApi';
import { type ExampleCreationRequest, runExampleCreation } from './jobs';
import type { AdminJobOptions, AdminJobState } from './types';
import { useAdminJob } from './useAdminJob';

export type UseExampleCreatorOptions = AdminJobOptions;

export interface UseExampleCreatorResult extends AdminJobState {
  /**
   * Counts the run works from: `currentCounts` at start plus every example
   * saved since. `{}` before the first run.
   */
  counts: Record<number, number>;
  /** Technique of a running `bit`/`level` run; null for `all` or when idle. */
  creatingTechniqueId: TechniqueId | null;
  /** Boards reset to techniques 0 by the current/last run. */
  resetBoardCount: number;
  /** Start a run; resolves with the final counts when it ends. */
  start: (request: ExampleCreationRequest) => Promise<Record<number, number>>;
  /** Stop now: shows "Stopped" and ignores the board in flight. */
  cancel: () => void;
}

/**
 * Wraps {@link runExampleCreation}. Example counts queries refresh on their
 * own (each save invalidates sudojo_client's `examples` queries), and a reset
 * board refreshes the `boards` counts.
 */
export function useExampleCreator(
  options: UseExampleCreatorOptions
): UseExampleCreatorResult {
  const api = useAdminApi(options.networkClient, options.baseUrl);
  const job = useAdminJob();
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [creatingTechniqueId, setCreatingTechniqueId] =
    useState<TechniqueId | null>(null);
  const [resetBoardCount, setResetBoardCount] = useState(0);
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;
  const startSeqRef = useRef(0);

  const { run, cancel: cancelJob } = job;

  const start = useCallback(
    async (request: ExampleCreationRequest) => {
      const seq = ++startSeqRef.current;
      setCounts({ ...request.currentCounts });
      setResetBoardCount(0);
      setCreatingTechniqueId(
        request.mode === 'all' ? null : request.techniqueId
      );
      const result = await run(
        api,
        () => getTokenRef.current(),
        (ctx, isLive) =>
          runExampleCreation(ctx, request, {
            onExampleSaved: (techniqueId, newCount) => {
              if (isLive()) {
                setCounts(prev => ({ ...prev, [techniqueId]: newCount }));
              }
            },
            onBoardTechniquesReset: boardUuid => {
              if (!isLive()) return;
              setResetBoardCount(n => n + 1);
              console.log(`Reset techniques for board ${boardUuid}`);
            },
          })
      );
      if (startSeqRef.current === seq) setCreatingTechniqueId(null);
      return result ?? { ...request.currentCounts };
    },
    [api, run]
  );

  const cancel = useCallback(() => {
    cancelJob(true);
    setCreatingTechniqueId(null);
  }, [cancelJob]);

  return {
    ...job.state,
    counts,
    creatingTechniqueId,
    resetBoardCount,
    start,
    cancel,
  };
}
