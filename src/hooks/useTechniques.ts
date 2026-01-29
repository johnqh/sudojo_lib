/**
 * Hook for fetching and managing Sudoku solving techniques
 */

import { useMemo } from 'react';
import type { Technique } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import {
  useSudojoTechnique,
  useSudojoTechniques,
} from '@sudobility/sudojo_client';

export interface UseTechniquesOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication (optional for public data) */
  token?: string;
  /** Optional level number (1-12) to filter techniques */
  level?: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseTechniquesResult {
  /** All techniques (optionally filtered by level) */
  techniques: Technique[];
  /** Whether techniques are loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch techniques */
  refetch: () => void;
  /** Get technique by its number (1-37) */
  getTechniqueByNumber: (technique: number) => Technique | undefined;
  /** Techniques sorted by technique number */
  sortedTechniques: Technique[];
  /** Group techniques by level number */
  techniquesByLevel: Map<number, Technique[]>;
}

/**
 * Hook for fetching and managing solving techniques
 *
 * @param options - Hook options
 * @returns Techniques data and utilities
 *
 * @example
 * ```tsx
 * function TechniqueList({ level }: { level: number }) {
 *   const { techniques, isLoading, sortedTechniques } = useTechniques({
 *     networkClient,
 *     baseUrl: 'https://api.sudojo.com',
 *     level,
 *   });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <ul>
 *       {sortedTechniques.map(technique => (
 *         <li key={technique.technique}>{technique.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTechniques(
  options: UseTechniquesOptions
): UseTechniquesResult {
  const { networkClient, baseUrl, token = '', level, enabled = true } = options;

  const queryParams = useMemo(() => {
    if (level === undefined) return undefined;
    return { level };
  }, [level]);

  const { data, isLoading, error, refetch } = useSudojoTechniques(
    networkClient,
    baseUrl,
    token,
    queryParams,
    { enabled }
  );

  const techniques = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return data.data;
  }, [data]);

  const sortedTechniques = useMemo(() => {
    return [...techniques].sort((a, b) => {
      // First sort by level, then by technique number
      if (a.level !== b.level) {
        return (a.level ?? 0) - (b.level ?? 0);
      }
      return a.technique - b.technique;
    });
  }, [techniques]);

  const getTechniqueByNumber = useMemo(() => {
    const techniqueMap = new Map(techniques.map(t => [t.technique, t]));
    return (technique: number) => techniqueMap.get(technique);
  }, [techniques]);

  const techniquesByLevel = useMemo(() => {
    const byLevel = new Map<number, Technique[]>();
    for (const technique of sortedTechniques) {
      const key = technique.level ?? 0;
      const existing = byLevel.get(key) ?? [];
      existing.push(technique);
      byLevel.set(key, existing);
    }
    return byLevel;
  }, [sortedTechniques]);

  return {
    techniques,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
    getTechniqueByNumber,
    sortedTechniques,
    techniquesByLevel,
  };
}

export interface UseTechniqueOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Access token for authentication (optional for public data) */
  token?: string;
  /** Technique number (1-37) to fetch */
  technique: number;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseTechniqueResult {
  /** The fetched technique */
  technique: Technique | null;
  /** Whether technique is loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch technique */
  refetch: () => void;
}

/**
 * Hook for fetching a single technique by number
 *
 * @param options - Hook options
 * @returns Technique data
 */
export function useTechnique(options: UseTechniqueOptions): UseTechniqueResult {
  const {
    networkClient,
    baseUrl,
    token = '',
    technique,
    enabled = true,
  } = options;

  const { data, isLoading, error, refetch } = useSudojoTechnique(
    networkClient,
    baseUrl,
    token,
    technique,
    {
      enabled: enabled && technique >= 1 && technique <= 37,
    }
  );

  const techniqueData = useMemo(() => {
    if (!data?.success || !data.data) return null;
    return data.data;
  }, [data]);

  return {
    technique: techniqueData,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
