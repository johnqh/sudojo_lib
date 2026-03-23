import { useMemo } from 'react';
import { type Belt, getBeltForLevel } from '@sudobility/sudojo_types';

export interface UseDisplayLevelResult {
  /** Display-friendly level number (internal level + 1). */
  displayLevel: number;
  /** Belt for this level, or null if no belt is mapped. */
  belt: Belt | null;
}

/**
 * Convert an internal user level to display-friendly values.
 *
 * The backend stores levels 0-indexed (level 0 = beginner).
 * This hook adds 1 so the user sees "Level 1" instead of "Level 0",
 * and resolves the belt from the canonical mapping.
 */
export function useDisplayLevel(internalLevel: number): UseDisplayLevelResult {
  return useMemo(
    () => ({
      displayLevel: internalLevel + 1,
      belt: getBeltForLevel(internalLevel),
    }),
    [internalLevel]
  );
}
