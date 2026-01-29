/**
 * Hook for fetching and managing Sudoku difficulty levels
 */

import { useMemo } from 'react';
import type { Level } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoLevel, useSudojoLevels } from '@sudobility/sudojo_client';

export interface UseLevelsOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication (optional for public data) */
  token?: string;
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
  /** Get level by its number (1-12) */
  getLevel: (level: number) => Level | undefined;
  /** Levels sorted by level number */
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
 *     baseUrl: 'https://api.sudojo.com',
 *   });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <ul>
 *       {sortedLevels.map(level => (
 *         <li key={level.level}>{level.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useLevels(options: UseLevelsOptions): UseLevelsResult {
  const { networkClient, baseUrl, token = '', enabled = true } = options;

  const { data, isLoading, error, refetch } = useSudojoLevels(
    networkClient,
    baseUrl,
    token,
    { enabled }
  );

  const levels = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return data.data;
  }, [data]);

  const sortedLevels = useMemo(() => {
    return [...levels].sort((a, b) => a.level - b.level);
  }, [levels]);

  const freeLevels = useMemo(() => {
    return sortedLevels.filter(level => !level.requires_subscription);
  }, [sortedLevels]);

  const premiumLevels = useMemo(() => {
    return sortedLevels.filter(level => level.requires_subscription);
  }, [sortedLevels]);

  const getLevel = useMemo(() => {
    const levelMap = new Map(levels.map(l => [l.level, l]));
    return (level: number) => levelMap.get(level);
  }, [levels]);

  return {
    levels,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
    getLevel,
    sortedLevels,
    freeLevels,
    premiumLevels,
  };
}

export interface UseLevelOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication (optional for public data) */
  token?: string;
  /** Level number (1-12) to fetch */
  level: number;
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
 * Hook for fetching a single level by number
 *
 * @param options - Hook options
 * @returns Level data
 */
export function useLevel(options: UseLevelOptions): UseLevelResult {
  const { networkClient, baseUrl, token = '', level, enabled = true } = options;

  const { data, isLoading, error, refetch } = useSudojoLevel(
    networkClient,
    baseUrl,
    token,
    level,
    {
      enabled: enabled && level >= 1 && level <= 12,
    }
  );

  const levelData = useMemo(() => {
    if (!data?.success || !data.data) return null;
    return data.data;
  }, [data]);

  return {
    level: levelData,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
