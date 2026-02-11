/**
 * Hook for fetching and managing game board for a specific level
 * Handles auth and subscription status with automatic refresh
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Board } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoRandomBoard } from '@sudobility/sudojo_client';
import { useQueryClient } from '@tanstack/react-query';

/** Game fetch status indicating what screen to show */
export type GameFetchStatus =
  | 'loading'
  | 'success'
  | 'auth_required'
  | 'subscription_required'
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
    subscriptionActive = false,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  // Track previous subscription state to detect changes
  const prevSubscriptionRef = useRef(subscriptionActive);

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
    { enabled: enabled && level >= 1 && level <= 12 }
  );

  // Determine status based on response
  // Cast to SudojoApiResponse to check for action field
  const apiResponse = data as SudojoApiResponse<Board> | undefined;

  const status = useMemo((): GameFetchStatus => {
    if (isLoading) return 'loading';
    if (isAuthRequired(apiResponse, error)) return 'auth_required';
    if (isSubscriptionRequired(apiResponse, error))
      return 'subscription_required';
    if (error) return 'error';
    if (apiResponse?.success && apiResponse.data) return 'success';
    return 'loading';
  }, [isLoading, apiResponse, error]);

  const board = useMemo(() => {
    if (data?.success && data.data) {
      return data.data;
    }
    return null;
  }, [data]);

  // Auto-refresh when subscription status changes from inactive to active
  // (e.g., user was on subscription_required screen and just subscribed).
  // Token changes are intentionally NOT watched — token refreshes (e.g.,
  // from hint API 401 retries) must never cause a new random board fetch.
  useEffect(() => {
    const subscriptionChanged = !prevSubscriptionRef.current && subscriptionActive;

    if (subscriptionChanged) {
      queryClient.invalidateQueries({
        queryKey: ['sudojo', 'boards', 'random'],
      });
      refetch();
    }

    prevSubscriptionRef.current = subscriptionActive;
  }, [subscriptionActive, queryClient, refetch]);

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
  };
}
