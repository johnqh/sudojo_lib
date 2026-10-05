/**
 * Hook for looking up a technique by its URL path, aliases included.
 */

import { useMemo } from 'react';
import type { Technique } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoTechniqueByPath } from '@sudobility/sudojo_client';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import {
  findTechniqueByPath,
  isSameTechniquePath,
  toApiTechniquePath,
  toCanonicalTechniquePath,
} from '../utils/technique';
import { useTechniques } from './useTechniques';

export interface UseTechniqueByPathOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token (optional for this public endpoint) */
  token?: string | null | undefined;
  /** API path or public slug (e.g. '3d-medusa' or 'medusa-coloring') */
  path: string | null | undefined;
  /** Whether to enable the queries (default true) */
  enabled?: boolean;
}

export interface UseTechniqueByPathResult {
  /** The technique, once found */
  technique: Technique | null;
  /** All techniques (from useTechniques; for dependencies and navigation) */
  techniques: Technique[];
  /** Public slug for the path ('3d-medusa' -> 'medusa-coloring') */
  canonicalPath: string | undefined;
  /** API path for the path ('medusa-coloring' -> '3d-medusa') */
  apiPath: string | undefined;
  /** Whether the lookup is still loading */
  isLoading: boolean;
  /** True once loading finished without finding the technique */
  notFound: boolean;
  /** Error from the technique list, if any */
  error: Error | null;
}

/**
 * Find a technique by path or alias. It is looked up in the cached technique
 * list (useTechniques, which the technique screens load anyway, as both apps
 * did); only when the list has loaded without it does it ask
 * `GET /techniques/path/:apiPath` (useSudojoTechniqueByPath).
 *
 * @example
 * ```tsx
 * const { technique, notFound } = useTechniqueByPath({ networkClient, baseUrl, path: slug });
 * ```
 */
export function useTechniqueByPath(
  options: UseTechniqueByPathOptions
): UseTechniqueByPathResult {
  const { path, enabled = true } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useTechniqueByPath'
  );
  const apiPath = toApiTechniquePath(path);
  const canonicalPath = toCanonicalTechniquePath(path);

  const {
    techniques,
    isLoading: listLoading,
    error,
  } = useTechniques({ networkClient, baseUrl, token, enabled });

  const fromList = useMemo(
    () => findTechniqueByPath(techniques, path) ?? null,
    [techniques, path]
  );

  const needFallback =
    enabled && !!apiPath && !listLoading && fromList === null;
  const { data, isLoading: pathLoading } = useSudojoTechniqueByPath(
    networkClient,
    baseUrl,
    token,
    apiPath ?? '',
    { enabled: needFallback, retry: false }
  );

  const fromPath = useMemo((): Technique | null => {
    const technique = data?.success ? data.data : undefined;
    return technique && isSameTechniquePath(technique.path, path)
      ? technique
      : null;
  }, [data, path]);

  const technique = fromList ?? fromPath;
  const isLoading =
    enabled && !!path && (listLoading || (needFallback && pathLoading));

  return {
    technique,
    techniques,
    canonicalPath,
    apiPath,
    isLoading,
    notFound: enabled && !!path && !isLoading && technique === null,
    error,
  };
}
