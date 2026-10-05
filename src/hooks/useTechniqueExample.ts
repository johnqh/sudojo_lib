/**
 * Hooks for a technique's worked example: fetch it (deterministic example
 * or random practice) and build its step-by-step walkthrough.
 */

import { useMemo } from 'react';
import type { NetworkClient } from '@sudobility/types';
import {
  useSudojoExamples,
  useSudojoRandomPractice,
} from '@sudobility/sudojo_client';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import {
  buildTechniqueWalkthrough,
  type TechniqueExampleSource,
  type TechniqueWalkthrough,
  type TechniqueWalkthroughTranslations,
} from '../utils/techniqueExample';

/**
 * Build (and memoize) the walkthrough for a stored example.
 * Pass stable translation functions (i18next `t`s are).
 */
export function useTechniqueWalkthrough(
  source: TechniqueExampleSource | null | undefined,
  translations: TechniqueWalkthroughTranslations,
  techniquePath?: string
): TechniqueWalkthrough {
  const { tHints, tTechniques, tCommon } = translations;
  return useMemo(
    () =>
      buildTechniqueWalkthrough(
        source,
        { tHints, tTechniques, tCommon },
        techniquePath
      ),
    [source, tHints, tTechniques, tCommon, techniquePath]
  );
}

/**
 * Where the example comes from:
 * - 'example': the first of `GET /examples?technique=` (deterministic, the
 *   same example every visit; web, and its build-time prerender)
 * - 'practice': a random practice (`GET /practices/technique/:id/random`; RN)
 */
export type TechniqueExampleSourceKind = 'example' | 'practice';

export interface UseTechniqueExampleOptions extends TechniqueWalkthroughTranslations {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token (default: SudojoApiProvider) */
  token?: string | null | undefined;
  /** Technique number (1-60); idle below 1 */
  techniqueId: number;
  /** Technique path slug, for the technique's localized title */
  techniquePath?: string | undefined;
  /** Example source (default 'example') */
  source?: TechniqueExampleSourceKind;
  /** Whether to enable the query (default true) */
  enabled?: boolean;
}

export interface UseTechniqueExampleResult extends TechniqueWalkthrough {
  /** The stored example, once loaded */
  example: TechniqueExampleSource | null;
  /** 'loading' | 'ready' (has an example) | 'empty' (none for this technique) */
  status: 'loading' | 'ready' | 'empty';
  /** Whether the request is in flight */
  isLoading: boolean;
  /** Fetch again (with source 'practice': another random practice) */
  refetch: () => void;
}

/**
 * Fetch a technique's worked example and build its walkthrough cards.
 *
 * @example
 * ```tsx
 * const { t: tHints } = useTranslation('hints');
 * const { t: tTechniques } = useTranslation('techniques');
 * const { t: tCommon } = useTranslation();
 * const { status, steps, stepHeadings } = useTechniqueExample({
 *   techniqueId, techniquePath, tHints, tTechniques, tCommon,
 * });
 * steps.map((step, i) => <Card heading={stepHeadings[i]} board={step.board} hint={step.hint} text={step.text} />)
 * ```
 */
export function useTechniqueExample(
  options: UseTechniqueExampleOptions
): UseTechniqueExampleResult {
  const {
    techniqueId,
    techniquePath,
    source = 'example',
    enabled = true,
    tHints,
    tTechniques,
    tCommon,
  } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useTechniqueExample'
  );
  const active = enabled && techniqueId >= 1;

  const examplesQuery = useSudojoExamples(
    networkClient,
    baseUrl,
    token,
    { technique: techniqueId },
    {
      enabled: active && source === 'example',
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );
  const practiceQuery = useSudojoRandomPractice(
    networkClient,
    baseUrl,
    token,
    techniqueId,
    { enabled: active && source === 'practice' }
  );

  const query = source === 'example' ? examplesQuery : practiceQuery;
  const example = useMemo((): TechniqueExampleSource | null => {
    if (source === 'example') {
      // Deterministic: the first example of the stable, ordered list.
      return examplesQuery.data?.data?.[0] ?? null;
    }
    return practiceQuery.data?.data ?? null;
  }, [source, examplesQuery.data, practiceQuery.data]);

  const walkthrough = useTechniqueWalkthrough(
    example,
    { tHints, tTechniques, tCommon },
    techniquePath
  );

  const isLoading = active && query.isLoading;
  const refetch = query.refetch;

  return {
    ...walkthrough,
    example,
    status: isLoading ? 'loading' : example ? 'ready' : 'empty',
    isLoading,
    refetch: () => {
      refetch();
    },
  };
}
