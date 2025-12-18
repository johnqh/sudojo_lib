/**
 * Hook for fetching and managing today's daily puzzle
 * Handles auth and subscription status with automatic refresh
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Daily } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import {
  type SudojoAuth,
  type SudojoConfig,
  useSudojoTodayDaily,
} from '@sudobility/sudojo_client';
import type { GameFetchStatus } from './useLevelGame';

/** Extended API response with action field from Sudojo API */
interface SudojoApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | null | undefined;
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

export interface UseDailyGameOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Auth credentials with access token */
  auth: SudojoAuth;
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
  const {
    networkClient,
    config,
    auth,
    subscriptionActive = false,
    enabled: _enabled = true,
  } = options;

  // Track previous state to detect changes
  const prevStateRef = useRef({
    authToken: auth.accessToken,
    subscriptionActive,
  });

  // Note: useSudojoTodayDaily doesn't support enabled option directly
  // We handle enabled by conditionally using the data
  const { data, isLoading, error, refetch } = useSudojoTodayDaily(
    networkClient,
    config,
    auth
  );

  // Determine status based on response
  const status = useMemo((): GameFetchStatus => {
    if (isLoading) return 'loading';
    if (isAuthRequired(data, error)) return 'auth_required';
    if (isSubscriptionRequired(data, error)) return 'subscription_required';
    if (error) return 'error';
    if (data?.success && data.data) return 'success';
    return 'loading';
  }, [isLoading, data, error]);

  const daily = useMemo(() => {
    if (data?.success && data.data) {
      return data.data;
    }
    return null;
  }, [data]);

  const dailyDate = useMemo((): string | null => {
    if (daily?.date) {
      const dateStr = new Date(daily.date).toISOString().split('T')[0];
      return dateStr ?? null;
    }
    return null;
  }, [daily]);

  // Auto-refresh when auth token or subscription status changes
  useEffect(() => {
    const prev = prevStateRef.current;
    const authChanged = prev.authToken !== auth.accessToken;
    const subscriptionChanged = !prev.subscriptionActive && subscriptionActive;

    if (authChanged || subscriptionChanged) {
      refetch();
    }

    // Update ref for next comparison
    prevStateRef.current = { authToken: auth.accessToken, subscriptionActive };
  }, [auth.accessToken, subscriptionActive, refetch]);

  return {
    daily,
    dailyDate,
    status,
    isLoading,
    error: error ?? (data?.error ? new Error(data.error) : null),
    refetch: () => refetch(),
  };
}
