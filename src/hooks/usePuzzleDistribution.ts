import { useMemo } from 'react';
import type { Level } from '@sudobility/sudojo_types';
import { getSubscriptionOfferId } from '@sudobility/sudojo_types';

/**
 * Compute the fraction of puzzles accessible for a given offering.
 *
 * Sums the `percentage` field (decimal 0–1) of matching levels based
 * on their derived subscription offer ID:
 *
 * - No offerId — only free levels (no subscription required)
 * - `'1_blue_belt'` — free levels + blue_belt levels
 * - Anything else — returns 1.0 (all puzzles)
 */
export function usePuzzleDistribution(
  levels: Level[],
  offerId?: string | null
): number {
  return useMemo(() => {
    if (offerId && offerId !== '1_blue_belt') return 1.0;

    let total = 0;
    for (const level of levels) {
      const levelOfferId = getSubscriptionOfferId(level.entitlement);
      if (
        !levelOfferId ||
        (offerId === '1_blue_belt' && levelOfferId === '1_blue_belt')
      ) {
        total += level.percentage ?? 0;
      }
    }
    return total;
  }, [levels, offerId]);
}
