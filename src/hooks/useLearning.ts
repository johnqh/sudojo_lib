/**
 * Hook for fetching and managing learning materials for techniques
 */

import { useMemo } from 'react';
import type { Learning } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import {
  useSudojoLearning,
  useSudojoLearningItem,
  type SudojoConfig,
} from '@sudobility/sudojo_client';

export interface UseLearningOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Optional technique UUID to filter learning materials */
  techniqueUuid?: string;
  /** Optional language code to filter learning materials */
  languageCode?: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseLearningResult {
  /** All learning materials (optionally filtered) */
  learningMaterials: Learning[];
  /** Whether learning materials are loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch learning materials */
  refetch: () => void;
  /** Get learning material by UUID */
  getLearningByUuid: (uuid: string) => Learning | undefined;
  /** Learning materials sorted by index */
  sortedLearning: Learning[];
  /** Group learning materials by technique UUID */
  learningByTechnique: Map<string, Learning[]>;
  /** Group learning materials by language code */
  learningByLanguage: Map<string, Learning[]>;
}

/**
 * Hook for fetching and managing learning materials
 *
 * @param options - Hook options
 * @returns Learning materials data and utilities
 *
 * @example
 * ```tsx
 * function LearningContent({ techniqueUuid }: { techniqueUuid: string }) {
 *   const { learningMaterials, isLoading, sortedLearning } = useLearning({
 *     networkClient,
 *     config: { baseUrl: 'https://api.sudojo.com' },
 *     techniqueUuid,
 *     languageCode: 'en',
 *   });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       {sortedLearning.map(item => (
 *         <div key={item.uuid}>
 *           <p>{item.text}</p>
 *           {item.image_url && <img src={item.image_url} alt="" />}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLearning(options: UseLearningOptions): UseLearningResult {
  const { networkClient, config, techniqueUuid, languageCode, enabled = true } = options;

  const queryParams = useMemo(() => {
    // Only return params if at least one filter is provided
    if (!techniqueUuid && !languageCode) return undefined;
    return {
      technique_uuid: techniqueUuid ?? null,
      language_code: languageCode ?? null,
    };
  }, [techniqueUuid, languageCode]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSudojoLearning(networkClient, config, queryParams, { enabled });

  const learningMaterials = useMemo(() => {
    if (!data?.success || !data.data) return [];
    return data.data;
  }, [data]);

  const sortedLearning = useMemo(() => {
    return [...learningMaterials].sort((a, b) => {
      // First sort by technique UUID, then by index
      if (a.technique_uuid !== b.technique_uuid) {
        return (a.technique_uuid ?? '').localeCompare(b.technique_uuid ?? '');
      }
      return a.index - b.index;
    });
  }, [learningMaterials]);

  const getLearningByUuid = useMemo(() => {
    const learningMap = new Map(learningMaterials.map(l => [l.uuid, l]));
    return (uuid: string) => learningMap.get(uuid);
  }, [learningMaterials]);

  const learningByTechnique = useMemo(() => {
    const byTechnique = new Map<string, Learning[]>();
    for (const learning of sortedLearning) {
      const key = learning.technique_uuid ?? '';
      const existing = byTechnique.get(key) ?? [];
      existing.push(learning);
      byTechnique.set(key, existing);
    }
    return byTechnique;
  }, [sortedLearning]);

  const learningByLanguage = useMemo(() => {
    const byLanguage = new Map<string, Learning[]>();
    for (const learning of sortedLearning) {
      const key = learning.language_code;
      const existing = byLanguage.get(key) ?? [];
      existing.push(learning);
      byLanguage.set(key, existing);
    }
    return byLanguage;
  }, [sortedLearning]);

  return {
    learningMaterials,
    isLoading,
    error: error ?? null,
    refetch: () => { refetch(); },
    getLearningByUuid,
    sortedLearning,
    learningByTechnique,
    learningByLanguage,
  };
}

export interface UseLearningItemOptions {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Sudojo API configuration */
  config: SudojoConfig;
  /** Learning item UUID to fetch */
  learningUuid: string;
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseLearningItemResult {
  /** The fetched learning item */
  learningItem: Learning | null;
  /** Whether learning item is loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Refetch learning item */
  refetch: () => void;
}

/**
 * Hook for fetching a single learning item by UUID
 *
 * @param options - Hook options
 * @returns Learning item data
 */
export function useLearningItem(options: UseLearningItemOptions): UseLearningItemResult {
  const { networkClient, config, learningUuid, enabled = true } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSudojoLearningItem(networkClient, config, learningUuid, {
    enabled: enabled && !!learningUuid,
  });

  const learningItem = useMemo(() => {
    if (!data?.success || !data.data) return null;
    return data.data;
  }, [data]);

  return {
    learningItem,
    isLoading,
    error: error ?? null,
    refetch: () => { refetch(); },
  };
}
