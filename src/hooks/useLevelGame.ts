/**
 * Hook for fetching and managing game board for a specific level
 * Handles auth and subscription status with automatic refresh
 */

import { useMemo } from 'react';
import type { Board } from '@sudobility/sudojo_types';
import { hasRequiredEntitlement } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoRandomBoard } from '@sudobility/sudojo_client';
import { useQueryClient } from '@tanstack/react-query';

/** Game fetch status indicating what screen to show */
export type GameFetchStatus =
  | 'loading'
  | 'success'
  | 'auth_required'
  | 'subscription_required'
  | 'entitlement_required'
  | 'error';

/** Extended API response with action field from Sudojo API */
interface SudojoApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | null;
  message?: string;
  action?: {
    type: string;
    options?: string[];
  };
}

/** Check if response indicates auth is required */
function isAuthRequired(
  response: SudojoApiResponse<unknown> | undefined,
  error: unknown
): boolean {
  if (
    response?.success === false &&
    response.action?.type === 'auth_required'
  ) {
    return true;
  }
  if (error && typeof error === 'object') {
    const err = error as { message?: string };
    if (err.message?.includes('Account required')) return true;
  }
  return false;
}

/** Check if response indicates subscription is required */
function isSubscriptionRequired(
  response: SudojoApiResponse<unknown> | undefined,
  error: unknown
): boolean {
  if (
    response?.success === false &&
    response.action?.type === 'subscription_required'
  ) {
    return true;
  }
  if (error && typeof error === 'object') {
    const err = error as { message?: string };
    if (
      err.message?.includes('Daily limit reached') ||
      err.message?.includes('subscription')
    ) {
      return true;
    }
  }
  return false;
}

export interface UseLevelGameOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication */
  token: string;
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
    networkClient,
    baseUrl,
    token,
    level,
    symmetrical,
    userEntitlements,
    levelEntitlement,
    enabled = true,
  } = options;

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
    { enabled: enabled && level >= 1 && level <= 12 && !entitlementDenied }
  );

  // Determine status based on response
  // Cast to SudojoApiResponse to check for action field
  const apiResponse = data as SudojoApiResponse<Board> | undefined;

  const status = useMemo((): GameFetchStatus => {
    if (entitlementDenied) return 'entitlement_required';
    if (isLoading) return 'loading';
    if (isAuthRequired(apiResponse, error)) return 'auth_required';
    if (isSubscriptionRequired(apiResponse, error))
      return 'subscription_required';
    if (error) return 'error';
    if (apiResponse?.success && apiResponse.data) return 'success';
    return 'loading';
  }, [entitlementDenied, isLoading, apiResponse, error]);

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
