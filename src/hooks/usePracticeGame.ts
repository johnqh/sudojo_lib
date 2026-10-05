/**
 * Hook for fetching a random practice puzzle for a technique, with the
 * auth / subscription / empty states the practice screens show.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { TechniquePractice } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { queryKeys, useSudojoRandomPractice } from '@sudobility/sudojo_client';
import { useQueryClient } from '@tanstack/react-query';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import {
  getPracticeFetchStatus,
  type PracticeFetchStatus,
} from '../utils/gameFetchStatus';

export interface UsePracticeGameOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token (default: SudojoApiProvider) */
  token?: string | null | undefined;
  /** Technique number (1-60); the query is idle for anything below 1 */
  techniqueId: number | null | undefined;
  /** Whether to enable the query (default true) */
  enabled?: boolean;
}

export interface UsePracticeGameResult {
  /** The practice puzzle, when loaded */
  practice: TechniquePractice | null;
  /** Which screen to show */
  status: PracticeFetchStatus;
  /** Whether the request is in flight */
  isLoading: boolean;
  /** The request error, if any */
  error: Error | null;
  /** Ask again (e.g. after a paywall purchase) */
  refetch: () => void;
  /** Drop the cached practice and fetch another random one */
  nextPractice: () => void;
}

/**
 * Fetch a random practice for a technique.
 *
 * The practice query is not keyed on the token, so when the status is
 * `auth_required` and the token changes (the reader signed in over the
 * screen) it refetches, as both apps did.
 *
 * @example
 * ```tsx
 * const { practice, status, refetch, nextPractice } = usePracticeGame({
 *   networkClient, baseUrl, token, techniqueId,
 * });
 * if (status === 'auth_required') return <SignInGate />;
 * if (status === 'subscription_required') return <Paywall onSuccess={refetch} />;
 * if (status === 'no_practices') return <Empty />;
 * if (status === 'ready') return <SudokuGame puzzle={practice.board} ... />;
 * ```
 */
export function usePracticeGame(
  options: UsePracticeGameOptions
): UsePracticeGameResult {
  const { techniqueId, enabled = true } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'usePracticeGame'
  );
  const technique = techniqueId ?? 0;
  const validTechnique = Number.isInteger(technique) && technique >= 1;
  const queryClient = useQueryClient();

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useSudojoRandomPractice(networkClient, baseUrl, token, technique, {
    enabled: enabled && validTechnique,
    staleTime: 0, // Always fetch fresh for random
    refetchOnWindowFocus: false, // Keep the current practice on focus
    retry: false,
  });

  const practice = response?.success ? (response.data ?? null) : null;

  const status = useMemo((): PracticeFetchStatus => {
    if (!validTechnique) return 'no_practices';
    return getPracticeFetchStatus({ isLoading, response, error });
  }, [validTechnique, isLoading, response, error]);

  // Signing in from the auth_required state asks again with the new token.
  const lastTokenRef = useRef(token);
  useEffect(() => {
    if (lastTokenRef.current === token) return;
    lastTokenRef.current = token;
    if (status === 'auth_required') refetch();
  }, [token, status, refetch]);

  const nextPractice = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.sudojo.practiceRandom(technique),
    });
    refetch();
  }, [queryClient, technique, refetch]);

  return {
    practice,
    status,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
    nextPractice,
  };
}
