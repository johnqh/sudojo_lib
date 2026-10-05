import { useMemo } from 'react';
import type { Level } from '@sudobility/sudojo_types';
import { getPuzzleDistribution } from '../utils/subscription';

/**
 * Compute the fraction of puzzles accessible for a given offering.
 *
 * Sums the `percentage` field (decimal 0–1) of matching levels based
 * on their derived subscription offer ID:
 *
 * - No offerId — only free levels (no subscription required)
 * - `'1_blue_belt'` — free levels + blue_belt levels
 * - Anything else — returns 1.0 (all puzzles)
 *
 * Memoized wrapper around the pure getPuzzleDistribution.
 */
export function usePuzzleDistribution(
  levels: Level[],
  offerId?: string | null
): number {
  return useMemo(
    () => getPuzzleDistribution(levels, offerId),
    [levels, offerId]
  );
}
