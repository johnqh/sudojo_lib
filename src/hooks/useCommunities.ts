/**
 * Hook for fetching communities filtered by language
 */

import { useMemo } from 'react';
import type { Community } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoCommunities } from '@sudobility/sudojo_client';

export interface UseCommunitiesOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication (optional for this public endpoint) */
  token?: string;
  /** Language code to filter communities (e.g., "en", "ja") */
  language?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseCommunitiesResult {
  /** All communities for the specified language */
  communities: Community[];
  /** Whether communities are loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch communities */
  refetch: () => void;
  /** Communities grouped by platform type */
  communitiesByPlatform: Map<string, Community[]>;
}

/**
 * Hook for fetching communities filtered by language.
 *
 * Unlike techniques/levels where the same records are translated,
 * communities are entirely different records per language.
 * Switching language triggers a new fetch with different results.
 *
 * @param options - Hook options
 * @returns Communities data and utilities
 */
export function useCommunities(
  options: UseCommunitiesOptions
): UseCommunitiesResult {
  const {
    networkClient,
    baseUrl,
    token = '',
    language,
    enabled = true,
  } = options;

  const queryParams = useMemo(() => {
    if (language === undefined) return undefined;
    return { language };
  }, [language]);

  const { data, isLoading, error, refetch } = useSudojoCommunities(
    networkClient,
    baseUrl,
    token,
    queryParams,
    { enabled }
  );

  const communities = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return data.data;
  }, [data]);

  const communitiesByPlatform = useMemo(() => {
    const byPlatform = new Map<string, Community[]>();
    for (const community of communities) {
      const key = community.platform;
      const existing = byPlatform.get(key) ?? [];
      existing.push(community);
      byPlatform.set(key, existing);
    }
    return byPlatform;
  }, [communities]);

  return {
    communities,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
    communitiesByPlatform,
  };
}
