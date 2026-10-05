/**
 * Hook for fetching and managing today's daily puzzle
 * Handles auth and subscription status with automatic refresh
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Daily } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import { useSudojoDailyByDate } from '@sudobility/sudojo_client';
import { getUtcDateString, normalizeDailyDate } from '../utils/date';
import {
  type GameFetchResponse,
  type GameFetchStatus,
  getGameFetchStatus,
} from '../utils/gameFetchStatus';

export interface UseDailyGameOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token for authentication */
  token?: string | undefined;
  /** Whether subscription is currently active */
  subscriptionActive?: boolean;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseDailyGameResult {
  /** Today's daily puzzle */
  daily: Daily | null;
  /** The date string for this daily (YYYY-MM-DD) */
  dailyDate: string | null;
  /** Current status of the game fetch */
  status: GameFetchStatus;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Refetch the daily puzzle */
  refetch: () => void;
}

/**
 * Hook for fetching today's daily puzzle
 *
 * Automatically refetches when auth token or subscription status changes.
 * Returns status indicating whether auth or subscription is required.
 *
 * "Today" is the **UTC** date (getUtcDateString), the same day the API's
 * `/dailies/today` serves, computed once per mount. (It used to be the local
 * date, which asked for tomorrow's or yesterday's daily near midnight.)
 * `dailyDate` is the daily's own `YYYY-MM-DD`, never timezone-shifted.
 *
 * @param options - Hook options
 * @returns Daily puzzle data and status
 *
 * @example
 * ```tsx
 * function DailyPage() {
 *   const { daily, dailyDate, status, refetch } = useDailyGame({
 *     networkClient,
 *     config,
 *     auth,
 *     subscriptionActive: subscription.isActive,
 *   });
 *
 *   if (status === 'loading') return <Loading />;
 *   if (status === 'auth_required') return <AuthRequired onLogin={openAuthModal} />;
 *   if (status === 'subscription_required') return <SubscriptionPaywall onSuccess={refetch} />;
 *   if (status === 'error') return <Error />;
 *
 *   return <SudokuGame puzzle={daily.board} solution={daily.solution} />;
 * }
 * ```
 */
export function useDailyGame(options: UseDailyGameOptions): UseDailyGameResult {
  const { subscriptionActive = false, enabled: _enabled = true } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useDailyGame'
  );

  // Track previous state to detect changes
  const prevStateRef = useRef({
    authToken: token,
    subscriptionActive,
  });

  // "Today" is the UTC date, the same day the API's /dailies/today serves.
  const todayDate = useMemo(() => getUtcDateString(), []);

  const { data, isLoading, error, refetch } = useSudojoDailyByDate(
    networkClient,
    baseUrl,
    token,
    todayDate
  );

  // Determine status based on response
  const status = useMemo(
    (): GameFetchStatus =>
      getGameFetchStatus({
        isLoading,
        response: data as GameFetchResponse | undefined,
        error,
      }),
    [isLoading, data, error]
  );

  const daily = useMemo(() => {
    if (data?.success && data.data) {
      return data.data;
    }
    return null;
  }, [data]);

  // The daily's calendar date as sent, without a timezone shift
  // (`new Date('YYYY-MM-DD')` is UTC midnight, the previous day west of UTC).
  const dailyDate = useMemo(
    (): string | null => normalizeDailyDate(daily?.date),
    [daily]
  );

  // Auto-refresh when auth token or subscription status changes
  useEffect(() => {
    const prev = prevStateRef.current;
    const authChanged = prev.authToken !== token;
    const subscriptionChanged = !prev.subscriptionActive && subscriptionActive;

    if (authChanged || subscriptionChanged) {
      refetch();
    }

    // Update ref for next comparison
    prevStateRef.current = { authToken: token, subscriptionActive };
  }, [token, subscriptionActive, refetch]);

  return {
    daily,
    dailyDate,
    status,
    isLoading,
    error: error ?? (data?.error ? new Error(data.error) : null),
    refetch: () => refetch(),
  };
}
