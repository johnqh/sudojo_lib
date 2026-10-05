/**
 * SudojoApiContext
 *
 * Optional React context that supplies the API connection (network client,
 * base URL, auth token) to sudojo_lib hooks. Apps wrap their tree with
 * SudojoApiProvider once; hooks whose options carry `networkClient` /
 * `baseUrl` / `token` may then omit them. Explicit options always win over
 * the context, so existing callers keep working unchanged.
 */

import { createContext, useContext } from 'react';
import type { NetworkClient } from '@sudobility/types';

/** The API connection the provider supplies. */
export interface SudojoApiValue {
  /** Network client for API calls */
  networkClient: NetworkClient;
  /** Base URL for the Sudojo API */
  baseUrl: string;
  /** Firebase ID token, or null/undefined when signed out */
  token?: string | null | undefined;
}

/** Optional API connection fields a hook's options may carry. */
export interface SudojoApiOptions {
  /** Network client for API calls (default: SudojoApiProvider's) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider's) */
  baseUrl?: string | undefined;
  /** Access token (default: SudojoApiProvider's, else '') */
  token?: string | null | undefined;
}

/** An API connection with every field resolved. */
export interface ResolvedSudojoApi {
  networkClient: NetworkClient;
  baseUrl: string;
  /** The token, '' when there is none */
  token: string;
}

const SudojoApiContext = createContext<SudojoApiValue | null>(null);

/**
 * The API connection from the nearest SudojoApiProvider.
 * @throws Error when there is no SudojoApiProvider above
 */
export function useSudojoApi(): SudojoApiValue {
  const value = useContext(SudojoApiContext);
  if (!value) {
    throw new Error(
      'useSudojoApi: no SudojoApiProvider above this component. Wrap the app in <SudojoApiProvider> or pass networkClient/baseUrl explicitly.'
    );
  }
  return value;
}

/** The API connection from the nearest SudojoApiProvider, or null. */
export function useOptionalSudojoApi(): SudojoApiValue | null {
  return useContext(SudojoApiContext);
}

/**
 * Merge explicit options over the provider's connection (pure; no hooks).
 * `token` falls back to the provider only when the option is undefined, so an
 * explicit null or '' means "no token".
 * @throws Error when neither supplies networkClient and baseUrl
 */
export function resolveSudojoApi(
  options: SudojoApiOptions,
  context: SudojoApiValue | null,
  hookName = 'sudojo_lib hook'
): ResolvedSudojoApi {
  const networkClient = options.networkClient ?? context?.networkClient;
  const baseUrl = options.baseUrl ?? context?.baseUrl;
  if (!networkClient || baseUrl === undefined) {
    throw new Error(
      `${hookName}: networkClient and baseUrl are required. Pass them in the options or wrap the app in <SudojoApiProvider>.`
    );
  }
  const token =
    options.token !== undefined ? options.token : (context?.token ?? null);
  return { networkClient, baseUrl, token: token ?? '' };
}

/**
 * Resolve a hook's API connection: explicit options first, then the
 * SudojoApiProvider.
 * @throws Error when neither supplies networkClient and baseUrl
 */
export function useResolvedSudojoApi(
  options: SudojoApiOptions,
  hookName?: string
): ResolvedSudojoApi {
  const context = useContext(SudojoApiContext);
  return resolveSudojoApi(options, context, hookName);
}

export { SudojoApiContext };
