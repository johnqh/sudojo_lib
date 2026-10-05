/**
 * Admin: generate boards continuously until stopped.
 */

import { useCallback, useRef, useState } from 'react';
import { useAdminApi } from './adminApi';
import { runBoardGeneration } from './jobs';
import type { AdminJobOptions, AdminJobState } from './types';
import { useAdminJob } from './useAdminJob';

export type UseBoardGeneratorOptions = AdminJobOptions;

export interface GeneratedBoardInfo {
  level: number;
  /** Exact techniques bitmask */
  techniques: bigint;
}

export interface UseBoardGeneratorResult extends AdminJobState {
  /** Boards saved by the current/last run. */
  generatedCount: number;
  /** Last saved board of the current/last run. */
  lastBoard: GeneratedBoardInfo | null;
  /** Start generating; resolves with the number saved when the run ends. */
  start: (options: { symmetrical: boolean }) => Promise<number>;
  /** Stop after the board in progress; shows "Stopped. Generated N boards." */
  cancel: () => void;
}

/**
 * Generate → validate → save boards until `cancel()` or a save fails.
 * Board count queries refresh on their own (each save invalidates
 * sudojo_client's `boards` queries).
 */
export function useBoardGenerator(
  options: UseBoardGeneratorOptions
): UseBoardGeneratorResult {
  const api = useAdminApi(options.networkClient, options.baseUrl);
  const job = useAdminJob();
  const [generatedCount, setGeneratedCount] = useState(0);
  const [lastBoard, setLastBoard] = useState<GeneratedBoardInfo | null>(null);
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;

  const { run, cancel: cancelJob } = job;

  const start = useCallback(
    async ({ symmetrical }: { symmetrical: boolean }) => {
      setGeneratedCount(0);
      setLastBoard(null);
      const count = await run(
        api,
        () => getTokenRef.current(),
        (ctx, isLive) =>
          runBoardGeneration(ctx, {
            symmetrical,
            onBoardGenerated: (n, level, techniques) => {
              if (!isLive()) return;
              setGeneratedCount(n);
              setLastBoard({ level, techniques });
            },
          })
      );
      return count ?? 0;
    },
    [api, run]
  );

  const cancel = useCallback(() => cancelJob(false), [cancelJob]);

  return { ...job.state, generatedCount, lastBoard, start, cancel };
}
