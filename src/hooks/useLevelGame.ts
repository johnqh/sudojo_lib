/**
 * Hook for fetching and managing game board for a specific level
 * Handles auth and subscription status with automatic refresh
 */

import { useMemo } from 'react';
import type { Board } from '@sudobility/sudojo_types';
import { hasRequiredEntitlement, isValidLevel } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import { useSudojoRandomBoard } from '@sudobility/sudojo_client';
import { useQueryClient } from '@tanstack/react-query';
import {
  type GameFetchResponse,
  type GameFetchStatus,
  getGameFetchStatus,
} from '../utils/gameFetchStatus';

export type { GameFetchStatus } from '../utils/gameFetchStatus';

export interface UseLevelGameOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token for authentication */
  token?: string | undefined;
  /** Level number (1-12) to fetch game for */
  level: number;
  /** Whether to fetch only symmetrical puzzles */
  symmetrical?: boolean;
  /** Whether subscription is currently active */
  subscriptionActive?: boolean;
  /** The user's active entitlement IDs (e.g., ['blue_belt'] or ['red_belt']) */
  userEntitlements?: string[];
  /** The entitlement field from the current level (e.g., "blue_belt,red_belt") */
  levelEntitlement?: string | null;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseLevelGameResult {
  /** The game board data */
  board: Board | null;
  /** Current status of the game fetch */
  status: GameFetchStatus;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Refetch the game board */
  refetch: () => void;
  /** Fetch a new random board for this level */
  nextPuzzle: () => void;
  /** The entitlement string required for this level (for paywall display) */
  requiredEntitlement: string | null;
}

/**
 * Hook for fetching a game board for a specific level
 *
 * Automatically refetches when auth token or subscription status changes.
 * Returns status indicating whether auth or subscription is required.
 *
 * @param options - Hook options
 * @returns Game board data and status
 *
 * @example
 * ```tsx
 * function LevelPlayPage({ level }: { level: number }) {
 *   const { board, status, refetch, nextPuzzle } = useLevelGame({
 *     networkClient,
 *     config,
 *     auth,
 *     level,
 *     subscriptionActive: subscription.isActive,
 *   });
 *
 *   if (status === 'loading') return <Loading />;
 *   if (status === 'auth_required') return <AuthRequired onLogin={openAuthModal} />;
 *   if (status === 'subscription_required') return <SubscriptionPaywall onSuccess={refetch} />;
 *   if (status === 'error') return <Error />;
 *
 *   return <SudokuGame puzzle={board.board} solution={board.solution} />;
 * }
 * ```
 */
export function useLevelGame(options: UseLevelGameOptions): UseLevelGameResult {
  const {
    level,
    symmetrical,
    userEntitlements,
    levelEntitlement,
    enabled = true,
  } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useLevelGame'
  );

  // Client-side entitlement check before making API call
  const entitlementDenied = useMemo(
    () => !hasRequiredEntitlement(levelEntitlement, userEntitlements ?? []),
    [levelEntitlement, userEntitlements]
  );

  const queryClient = useQueryClient();

  const queryParams = useMemo(
    () => ({
      level,
      symmetrical: symmetrical || undefined,
      limit: undefined,
      offset: undefined,
      techniques: undefined,
      technique_bit: undefined,
    }),
    [level, symmetrical]
  );

  const { data, isLoading, error, refetch } = useSudojoRandomBoard(
    networkClient,
    baseUrl,
    token,
    queryParams,
    { enabled: enabled && isValidLevel(level) && !entitlementDenied }
  );

  // Determine status based on response (incl. the legacy `action` field)
  const status = useMemo(
    (): GameFetchStatus =>
      getGameFetchStatus({
        isLoading,
        response: data as GameFetchResponse | undefined,
        error,
        entitlementDenied,
      }),
    [entitlementDenied, isLoading, data, error]
  );

  const board = useMemo(() => {
    if (data?.success && data.data) {
      return data.data;
    }
    return null;
  }, [data]);

  const nextPuzzle = useMemo(() => {
    return () => {
      queryClient.invalidateQueries({
        queryKey: ['sudojo', 'boards', 'random'],
      });
      refetch();
    };
  }, [queryClient, refetch]);

  return {
    board,
    status,
    isLoading,
    error: error ?? null,
    refetch: () => refetch(),
    nextPuzzle,
    requiredEntitlement: levelEntitlement ?? null,
  };
}
