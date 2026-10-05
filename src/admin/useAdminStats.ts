/**
 * Admin: board/example counts and the "update puzzle stats" action, replacing
 * AdminPage's hand-rolled loading state.
 */

import {
  useSudojoBoardCounts,
  useSudojoBoardCountsByTechnique,
  useSudojoExampleCounts,
  useSudojoUpdatePuzzleStats,
} from '@sudobility/sudojo_client';
import type { UpdateStatsData } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useCallback, useMemo, useState } from 'react';
import { normalizeTechniqueCounts } from './examples';

export interface UseAdminStatsOptions {
  networkClient: NetworkClient;
  baseUrl: string;
  /** Admin ID token; queries stay idle and the action errors without one. */
  token: string | null;
  /** Load `/boards/counts` (boards and techniques sections). Default true. */
  loadBoardCounts?: boolean;
  /** Load `/examples/counts` and `/boards/counts/by-technique` (examples section). Default true. */
  loadTechniqueCounts?: boolean;
}

export interface UseAdminStatsResult {
  totalBoards: number;
  boardsWithoutTechniques: number;
  /** First load of the board counts. */
  isBoardCountsLoading: boolean;
  /** Example counts by technique id. */
  exampleCounts: Record<number, number>;
  /** Board counts by technique id. */
  boardCountsByTechnique: Record<number, number>;
  /** First load of either technique counts map. */
  isTechniqueCountsLoading: boolean;
  /** Refetch every enabled count. */
  refetchCounts: () => Promise<void>;

  /** Recalculate level/technique percentages on the server. */
  updatePuzzleStats: () => Promise<void>;
  isUpdatingStats: boolean;
  /** Status line of the last update ('' before the first). */
  statsProgress: string;
  /** Result of the last successful update. */
  statsResult: UpdateStatsData | null;
}

/** Status line for an update-stats result. */
export function describeUpdateStatsResult(data: UpdateStatsData): string {
  const levelCount = Object.keys(data.levels).length;
  const techCount = Object.keys(data.techniques).length;
  return `Updated ${levelCount} levels and ${techCount} techniques.`;
}

/**
 * Counts refresh by themselves after the admin jobs save, because
 * sudojo_client's create/update mutations invalidate the `boards` and
 * `examples` queries.
 */
export function useAdminStats(
  options: UseAdminStatsOptions
): UseAdminStatsResult {
  const {
    networkClient,
    baseUrl,
    token,
    loadBoardCounts = true,
    loadTechniqueCounts = true,
  } = options;
  const authToken = token ?? '';

  const boardCounts = useSudojoBoardCounts(networkClient, baseUrl, authToken, {
    enabled: !!token && loadBoardCounts,
  });
  const exampleCountsQuery = useSudojoExampleCounts(
    networkClient,
    baseUrl,
    authToken,
    { enabled: !!token && loadTechniqueCounts }
  );
  const byTechniqueQuery = useSudojoBoardCountsByTechnique(
    networkClient,
    baseUrl,
    authToken,
    { enabled: !!token && loadTechniqueCounts }
  );
  const updateStats = useSudojoUpdatePuzzleStats(networkClient, baseUrl);

  const [statsProgress, setStatsProgress] = useState('');
  const [statsResult, setStatsResult] = useState<UpdateStatsData | null>(null);

  const exampleData = exampleCountsQuery.data;
  const exampleCounts = useMemo(
    () =>
      normalizeTechniqueCounts(
        exampleData?.success ? exampleData.data : undefined
      ),
    [exampleData]
  );
  const byTechniqueData = byTechniqueQuery.data;
  const boardCountsByTechnique = useMemo(
    () =>
      normalizeTechniqueCounts(
        byTechniqueData?.success ? byTechniqueData.data : undefined
      ),
    [byTechniqueData]
  );
  const counts = boardCounts.data?.success ? boardCounts.data.data : null;

  const { refetch: refetchBoardCounts } = boardCounts;
  const { refetch: refetchExampleCounts } = exampleCountsQuery;
  const { refetch: refetchByTechnique } = byTechniqueQuery;
  const refetchCounts = useCallback(async () => {
    if (!token) return;
    const pending: Promise<unknown>[] = [];
    if (loadBoardCounts) pending.push(refetchBoardCounts());
    if (loadTechniqueCounts) {
      pending.push(refetchExampleCounts(), refetchByTechnique());
    }
    await Promise.all(pending);
  }, [
    token,
    loadBoardCounts,
    loadTechniqueCounts,
    refetchBoardCounts,
    refetchExampleCounts,
    refetchByTechnique,
  ]);

  const { mutateAsync: updateStatsAsync, isPending: isUpdatingStats } =
    updateStats;
  const updatePuzzleStats = useCallback(async () => {
    if (!token) {
      setStatsProgress('Error: Not authenticated');
      return;
    }
    setStatsProgress('Calculating puzzle stats...');
    try {
      const response = await updateStatsAsync({ token });
      if (response.success && response.data) {
        setStatsResult(response.data);
        setStatsProgress(describeUpdateStatsResult(response.data));
      } else {
        setStatsProgress('Error: Failed to update stats');
      }
    } catch (err) {
      setStatsProgress(
        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [token, updateStatsAsync]);

  return {
    totalBoards: counts?.total ?? 0,
    boardsWithoutTechniques: counts?.withoutTechniques ?? 0,
    isBoardCountsLoading: boardCounts.isLoading,
    exampleCounts,
    boardCountsByTechnique,
    isTechniqueCountsLoading:
      exampleCountsQuery.isLoading || byTechniqueQuery.isLoading,
    refetchCounts,
    updatePuzzleStats,
    isUpdatingStats,
    statsProgress,
    statsResult,
  };
}
