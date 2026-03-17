/**
 * EntitlementContext
 *
 * Provides the current user's active entitlement IDs to sudojo_lib hooks.
 * Apps wrap their tree with EntitlementProvider, feeding entitlements from
 * their platform-specific subscription system (RevenueCat RN, web SDK, etc.).
 */

import { createContext, useContext } from 'react';

const EntitlementContext = createContext<string[]>([]);

/**
 * Hook to access the current user's entitlements.
 * Returns an empty array if no EntitlementProvider is above in the tree.
 */
export function useEntitlementContext(): string[] {
  return useContext(EntitlementContext);
}

export { EntitlementContext };
