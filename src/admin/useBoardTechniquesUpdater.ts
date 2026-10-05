/**
 * Admin: one-off board technique calls (exact bitmasks sent as strings).
 */

import type { Board, TechniqueId } from '@sudobility/sudojo_types';
import { useCallback, useRef } from 'react';
import { useAdminApi } from './adminApi';
import { fetchBoardsWithTechnique, updateBoardTechniques } from './jobs';
import type { AdminJobOptions } from './types';

export type UseBoardTechniquesUpdaterOptions = AdminJobOptions;

export interface UseBoardTechniquesUpdaterResult {
  /** Set a board's techniques bitmask and level. false on any failure or no token. */
  updateBoardTechniques: (
    boardUuid: string,
    techniques: bigint,
    level: number | null
  ) => Promise<boolean>;
  /** Boards with the technique's bit set, any level. [] on any failure or no token. */
  fetchBoardsWithTechnique: (
    techniqueId: TechniqueId,
    limit: number
  ) => Promise<Board[]>;
}

export function useBoardTechniquesUpdater(
  options: UseBoardTechniquesUpdaterOptions
): UseBoardTechniquesUpdaterResult {
  const api = useAdminApi(options.networkClient, options.baseUrl);
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;

  const update = useCallback(
    async (boardUuid: string, techniques: bigint, level: number | null) => {
      const token = await getTokenRef.current();
      if (!token) return false;
      return updateBoardTechniques(api, token, boardUuid, techniques, level);
    },
    [api]
  );

  const fetchWithTechnique = useCallback(
    async (techniqueId: TechniqueId, limit: number) => {
      const token = await getTokenRef.current();
      if (!token) return [];
      return fetchBoardsWithTechnique(api, token, techniqueId, limit);
    },
    [api]
  );

  return {
    updateBoardTechniques: update,
    fetchBoardsWithTechnique: fetchWithTechnique,
  };
}
