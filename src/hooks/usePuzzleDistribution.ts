import { useMemo } from 'react';
import type { HintEntitlement, Level } from '@sudobility/sudojo_types';
import { parseEntitlements } from '@sudobility/sudojo_types';

/**
 * Compute the fraction of puzzles accessible at a given entitlement tier.
 *
 * Sums the `percentage` field (decimal 0–1) of every level whose
 * entitlement requirement is met:
 *
 * - No entitlement param — only free levels (no entitlement required)
 * - `'blue_belt'` — free levels + levels whose entitlement includes `blue_belt`
 * - `'red_belt'` — free levels + levels whose entitlement includes `red_belt`
 */
export function usePuzzleDistribution(
  levels: Level[],
  entitlement?: HintEntitlement | null
): number {
  return useMemo(() => {
    let total = 0;
    for (const level of levels) {
      const required = parseEntitlements(level.entitlement);
      if (
        required.length === 0 ||
        (entitlement && required.includes(entitlement))
      ) {
        total += level.percentage ?? 0;
      }
    }
    return total;
  }, [levels, entitlement]);
}
