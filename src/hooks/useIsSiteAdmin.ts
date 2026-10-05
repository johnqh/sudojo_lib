/**
 * User account status hooks: real (non-anonymous) user and site admin.
 */

import { useMemo } from 'react';
import type { NetworkClient } from '@sudobility/types';
import { useSudojoUser } from '@sudobility/sudojo_client';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import { type AuthUser, isAuthenticatedUser, isRealUser } from '../utils/auth';

/**
 * Whether the user is a real (signed-in, non-anonymous) account
 * (`!!user && !user.isAnonymous`).
 */
export function useIsRealUser(
  user: Pick<AuthUser, 'isAnonymous'> | null | undefined
): boolean {
  return useMemo(() => isRealUser(user), [user]);
}

export interface UseIsSiteAdminOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token (default: SudojoApiProvider) */
  token?: string | null | undefined;
  /** The signed-in user (null/undefined when signed out) */
  user: AuthUser | null | undefined;
}

export interface UseIsSiteAdminResult {
  /** True once the API's user record says this user is a site admin. */
  isSiteAdmin: boolean;
  /**
   * True once the user record has loaded or failed. Stays false while the
   * request is pending and while it is disabled (no real user or token), as
   * in the web hook, so a guard can keep waiting during auth start-up.
   */
  isResolved: boolean;
}

/**
 * Whether the signed-in user is a site admin, from the API's user record
 * (`GET /users/:uid` -> `siteAdmin`). The request only runs for a real user
 * with a token (isAuthenticatedUser): the endpoint returns 403 for anonymous
 * users. The API still authorizes every admin call; this only decides what
 * the UI shows.
 */
export function useIsSiteAdmin(
  options: UseIsSiteAdminOptions
): UseIsSiteAdminResult {
  const { user } = options;
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useIsSiteAdmin'
  );
  const { data, isSuccess, isError } = useSudojoUser(
    networkClient,
    baseUrl,
    token,
    user?.uid ?? '',
    { enabled: isAuthenticatedUser(user, token) }
  );
  return {
    isSiteAdmin: data?.data?.siteAdmin ?? false,
    isResolved: isSuccess || isError,
  };
}
