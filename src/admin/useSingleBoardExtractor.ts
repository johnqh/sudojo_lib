/**
 * Admin: extract one board's techniques, or find a technique example in it.
 */

import type { TechniqueId } from '@sudobility/sudojo_types';
import { useCallback, useRef } from 'react';
import { useAdminApi } from './adminApi';
import {
  type BoardExtractionOutcome,
  extractBoardTechniques,
} from './extraction';
import type { AdminJobOptions } from './types';

export type UseSingleBoardExtractorOptions = AdminJobOptions;

export interface UseSingleBoardExtractorResult {
  /**
   * Walk `original` with /solve. Without `desiredTechnique`: the accumulated
   * `{ techniques, level }`. With it: `{ type: 'found', … }` at the first
   * matching hint, else the accumulated result. `{ error }` on invalid
   * pencilmarks, a 400, no token, or after 200 steps.
   */
  extract: (
    original: string,
    desiredTechnique?: TechniqueId
  ) => Promise<BoardExtractionOutcome>;
}

export function useSingleBoardExtractor(
  options: UseSingleBoardExtractorOptions
): UseSingleBoardExtractorResult {
  const api = useAdminApi(options.networkClient, options.baseUrl);
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;

  const extract = useCallback(
    async (
      original: string,
      desiredTechnique?: TechniqueId
    ): Promise<BoardExtractionOutcome> => {
      const token = await getTokenRef.current();
      if (!token) return { error: 'Not authenticated' };
      return extractBoardTechniques(
        opts => api.solve(token, opts),
        original,
        desiredTechnique
      );
    },
    [api]
  );

  return { extract };
}
