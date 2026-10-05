/**
 * Hook for fetching the solving strategies (technique groups)
 */

import { useCallback, useMemo } from 'react';
import type { Strategy } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoStrategies } from '@sudobility/sudojo_client';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import { findStrategyByStub as findByStub } from '../utils/technique';

export interface UseStrategiesOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token (optional for this public endpoint) */
  token?: string | null | undefined;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseStrategiesResult {
  /** All strategies ([] while loading or when the request failed) */
  strategies: Strategy[];
  /** Whether strategies are loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch strategies */
  refetch: () => void;
  /** Find a strategy by its URL stub */
  findStrategyByStub: (stub: string | null | undefined) => Strategy | undefined;
}

/**
 * Fetch all strategies, unwrapped the way the apps did
 * (`success ? data ?? [] : []`).
 *
 * @example
 * ```tsx
 * const { strategies, findStrategyByStub } = useStrategies({ networkClient, baseUrl });
 * const strategy = findStrategyByStub(stub);
 * ```
 */
export function useStrategies(
  options: UseStrategiesOptions = {}
): UseStrategiesResult {
  const { enabled = true } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useStrategies'
  );

  const { data, isLoading, error, refetch } = useSudojoStrategies(
    networkClient,
    baseUrl,
    token,
    { enabled }
  );

  const strategies = useMemo(
    (): Strategy[] => (data?.success ? (data.data ?? []) : []),
    [data]
  );

  const findStrategyByStub = useCallback(
    (stub: string | null | undefined) => findByStub(strategies, stub),
    [strategies]
  );

  return {
    strategies,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
    findStrategyByStub,
  };
}
