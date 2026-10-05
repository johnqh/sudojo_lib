/**
 * Hook for fetching and managing Sudoku solving techniques
 */

import { useMemo } from 'react';
import type { Technique } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import {
  useSudojoTechnique,
  useSudojoTechniques,
} from '@sudobility/sudojo_client';
import {
  groupTechniquesByLevel,
  sortTechniquesByLevel,
} from '../utils/technique';

export interface UseTechniquesOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
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
  /** Get technique by its number */
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
  const { level, enabled = true } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useTechniques'
  );

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

  // First sort by level, then by technique number
  const sortedTechniques = useMemo(
    () => sortTechniquesByLevel(techniques),
    [techniques]
  );

  const getTechniqueByNumber = useMemo(() => {
    const techniqueMap = new Map(techniques.map(t => [t.technique, t]));
    return (technique: number) => techniqueMap.get(technique);
  }, [techniques]);

  const techniquesByLevel = useMemo(
    () => groupTechniquesByLevel(sortedTechniques),
    [sortedTechniques]
  );

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
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token for authentication (optional for public data) */
  token?: string;
  /** Technique number to fetch */
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
  const { technique, enabled = true } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useTechnique'
  );

  const { data, isLoading, error, refetch } = useSudojoTechnique(
    networkClient,
    baseUrl,
    token,
    technique,
    {
      enabled: enabled && technique >= 1,
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
