/**
 * Hook for fetching and managing Sudoku solving techniques
 */

import { useMemo } from 'react';
import type { Technique } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import {
  type SudojoConfig,
  useSudojoTechnique,
  useSudojoTechniques,
} from '@sudobility/sudojo_client';

export interface UseTechniquesOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Optional level UUID to filter techniques */
  levelUuid?: string;
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
  /** Get technique by UUID */
  getTechniqueByUuid: (uuid: string) => Technique | undefined;
  /** Techniques sorted by index */
  sortedTechniques: Technique[];
  /** Group techniques by level UUID */
  techniquesByLevel: Map<string, Technique[]>;
}

/**
 * Hook for fetching and managing solving techniques
 *
 * @param options - Hook options
 * @returns Techniques data and utilities
 *
 * @example
 * ```tsx
 * function TechniqueList({ levelUuid }: { levelUuid: string }) {
 *   const { techniques, isLoading, sortedTechniques } = useTechniques({
 *     networkClient,
 *     config: { baseUrl: 'https://api.sudojo.com' },
 *     levelUuid,
 *   });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <ul>
 *       {sortedTechniques.map(technique => (
 *         <li key={technique.uuid}>{technique.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTechniques(
  options: UseTechniquesOptions
): UseTechniquesResult {
  const { networkClient, config, levelUuid, enabled = true } = options;

  const queryParams = useMemo(() => {
    if (!levelUuid) return undefined;
    return { level_uuid: levelUuid };
  }, [levelUuid]);

  const { data, isLoading, error, refetch } = useSudojoTechniques(
    networkClient,
    config,
    queryParams,
    { enabled }
  );

  const techniques = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return data.data;
  }, [data]);

  const sortedTechniques = useMemo(() => {
    return [...techniques].sort((a, b) => {
      // First sort by level UUID, then by index
      if (a.level_uuid !== b.level_uuid) {
        return (a.level_uuid ?? '').localeCompare(b.level_uuid ?? '');
      }
      return a.index - b.index;
    });
  }, [techniques]);

  const getTechniqueByUuid = useMemo(() => {
    const techniqueMap = new Map(techniques.map(t => [t.uuid, t]));
    return (uuid: string) => techniqueMap.get(uuid);
  }, [techniques]);

  const techniquesByLevel = useMemo(() => {
    const byLevel = new Map<string, Technique[]>();
    for (const technique of sortedTechniques) {
      const key = technique.level_uuid ?? '';
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
    getTechniqueByUuid,
    sortedTechniques,
    techniquesByLevel,
  };
}

export interface UseTechniqueOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Technique UUID to fetch */
  techniqueUuid: string;
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
 * Hook for fetching a single technique by UUID
 *
 * @param options - Hook options
 * @returns Technique data
 */
export function useTechnique(options: UseTechniqueOptions): UseTechniqueResult {
  const { networkClient, config, techniqueUuid, enabled = true } = options;

  const { data, isLoading, error, refetch } = useSudojoTechnique(
    networkClient,
    config,
    techniqueUuid,
    {
      enabled: enabled && !!techniqueUuid,
    }
  );

  const technique = useMemo(() => {
    if (!data?.success || !data.data) return null;
    return data.data;
  }, [data]);

  return {
    technique,
    isLoading,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
