/**
 * EntitlementProvider
 *
 * Wraps the app tree to provide entitlements to sudojo_lib hooks
 * like useLevelEnabled and useTechniqueEnabled.
 */

import React from 'react';
import { EntitlementContext } from './EntitlementContext';

interface EntitlementProviderProps {
  /** Active entitlement IDs from the subscription system */
  entitlements: string[];
  children: React.ReactNode;
}

export function EntitlementProvider({
  entitlements,
  children,
}: EntitlementProviderProps) {
  return (
    <EntitlementContext.Provider value={entitlements}>
      {children}
    </EntitlementContext.Provider>
  );
}
