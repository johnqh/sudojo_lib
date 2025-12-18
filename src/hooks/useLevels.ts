/**
 * Hook for fetching and managing Sudoku difficulty levels
 */

import { useMemo } from 'react';
import type { Level } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import {
  type SudojoAuth,
  type SudojoConfig,
  useSudojoLevel,
  useSudojoLevels,
} from '@sudobility/sudojo_client';

/** Default empty auth for public endpoints */
const DEFAULT_AUTH: SudojoAuth = { accessToken: '' };

export interface UseLevelsOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Auth credentials (optional for public data) */
  auth?: SudojoAuth;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseLevelsResult {
  /** All available levels */
  levels: Level[];
  /** Whether levels are loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch levels */
  refetch: () => void;
  /** Get level by UUID */
  getLevelByUuid: (uuid: string) => Level | undefined;
  /** Get level by index */
  getLevelByIndex: (index: number) => Level | undefined;
  /** Levels sorted by index */
  sortedLevels: Level[];
  /** Free levels (no subscription required) */
  freeLevels: Level[];
  /** Premium levels (subscription required) */
  premiumLevels: Level[];
}

/**
 * Hook for fetching and managing difficulty levels
 *
 * @param options - Hook options
 * @returns Levels data and utilities
 *
 * @example
 * ```tsx
 * function LevelSelector() {
 *   const { levels, isLoading, sortedLevels } = useLevels({
 *     networkClient,
 *     config: { baseUrl: 'https://api.sudojo.com' },
 *   });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <ul>
 *       {sortedLevels.map(level => (
 *         <li key={level.uuid}>{level.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useLevels(options: UseLevelsOptions): UseLevelsResult {
  const {
    networkClient,
    config,
    auth = DEFAULT_AUTH,
    enabled = true,
  } = options;

  const { data, isLoading, error, refetch } = useSudojoLevels(
    networkClient,
    config,
    auth,
    { enabled }
  );

  const levels = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return data.data;
  }, [data]);

  const sortedLevels = useMemo(() => {
    return [...levels].sort((a, b) => a.index - b.index);
  }, [levels]);

  const freeLevels = useMemo(() => {
    return sortedLevels.filter(level => !level.requires_subscription);
  }, [sortedLevels]);

  const premiumLevels = useMemo(() => {
    return sortedLevels.filter(level => level.requires_subscription);
  }, [sortedLevels]);

  const getLevelByUuid = useMemo(() => {
    const levelMap = new Map(levels.map(l => [l.uuid, l]));
    return (uuid: string) => levelMap.get(uuid);
  }, [levels]);

  const getLevelByIndex = useMemo(() => {
    const indexMap = new Map(levels.map(l => [l.index, l]));
    return (index: number) => indexMap.get(index);
  }, [levels]);

  return {
    levels,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
    getLevelByUuid,
    getLevelByIndex,
    sortedLevels,
    freeLevels,
    premiumLevels,
  };
}

export interface UseLevelOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Auth credentials (optional for public data) */
  auth?: SudojoAuth;
  /** Level UUID to fetch */
  levelUuid: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseLevelResult {
  /** The fetched level */
  level: Level | null;
  /** Whether level is loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch level */
  refetch: () => void;
}

/**
 * Hook for fetching a single level by UUID
 *
 * @param options - Hook options
 * @returns Level data
 */
export function useLevel(options: UseLevelOptions): UseLevelResult {
  const {
    networkClient,
    config,
    auth = DEFAULT_AUTH,
    levelUuid,
    enabled = true,
  } = options;

  const { data, isLoading, error, refetch } = useSudojoLevel(
    networkClient,
    config,
    auth,
    levelUuid,
    {
      enabled: enabled && !!levelUuid,
    }
  );

  const level = useMemo(() => {
    if (!data?.success || !data.data) return null;
    return data.data;
  }, [data]);

  return {
    level,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
