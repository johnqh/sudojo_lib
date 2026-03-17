/**
 * Entitlement-based access hooks
 *
 * Check whether a level or technique is enabled for the current user's
 * subscription entitlements. Uses EntitlementContext provided by the app.
 */

import { useMemo } from 'react';
import type { Level, Technique } from '@sudobility/sudojo_types';
import { hasRequiredEntitlement } from '@sudobility/sudojo_types';
import { useEntitlementContext } from '../context';

/**
 * Check whether a level is enabled for the current user.
 *
 * Returns `true` if the level is free (no entitlement required) or the user
 * has at least one of the required entitlements.
 *
 * @param level - Level object (needs its `entitlement` field), or null/undefined
 * @returns Whether the user can access this level
 *
 * @example
 * ```tsx
 * const enabled = useLevelEnabled(level);
 * if (!enabled) return <SubscriptionPaywall />;
 * ```
 */
export function useLevelEnabled(level: Level | null | undefined): boolean {
  const entitlements = useEntitlementContext();

  return useMemo(
    () => hasRequiredEntitlement(level?.entitlement, entitlements),
    [level?.entitlement, entitlements]
  );
}

/**
 * Check whether a technique is enabled for the current user.
 *
 * Looks up the technique's parent level in the provided levels array
 * and checks the level's entitlement against the user's subscription.
 *
 * @param technique - Technique object (needs its `level` field), or null/undefined
 * @param levels - Array of all levels (used to look up the technique's parent level)
 * @returns Whether the user can access this technique
 *
 * @example
 * ```tsx
 * const enabled = useTechniqueEnabled(technique, levels);
 * if (!enabled) return <LockedBadge />;
 * ```
 */
export function useTechniqueEnabled(
  technique: Technique | null | undefined,
  levels: Level[]
): boolean {
  const entitlements = useEntitlementContext();

  return useMemo(() => {
    if (!technique?.level) return true; // unassigned technique = free
    const parentLevel = levels.find(l => l.level === technique.level);
    return hasRequiredEntitlement(parentLevel?.entitlement, entitlements);
  }, [technique?.level, levels, entitlements]);
}
