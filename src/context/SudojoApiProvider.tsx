/**
 * SudojoApiProvider
 *
 * Supplies the API connection (network client, base URL, token) to
 * sudojo_lib hooks, so callers can omit those options. Optional: hooks still
 * accept them explicitly, and explicit values win.
 */

import React, { useMemo } from 'react';
import type { NetworkClient } from '@sudobility/types';
import { SudojoApiContext } from './SudojoApiContext';

interface SudojoApiProviderProps {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Firebase ID token, or null/undefined when signed out */
  token?: string | null | undefined;
  children: React.ReactNode;
}

export function SudojoApiProvider({
  networkClient,
  baseUrl,
  token,
  children,
}: SudojoApiProviderProps) {
  const value = useMemo(
    () => ({ networkClient, baseUrl, token }),
    [networkClient, baseUrl, token]
  );
  return (
    <SudojoApiContext.Provider value={value}>
      {children}
    </SudojoApiContext.Provider>
  );
}
