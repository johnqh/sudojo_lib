/**
 * Auth-related utility functions for determining when to make
 * authenticated API calls.
 *
 * Business rule: user info endpoints (profile, siteAdmin) should not
 * be called for anonymous users, as they will return 403. Other
 * user-specific endpoints (subscriptions, gamification) may still
 * work for anonymous users.
 */

/** Minimal user shape needed for auth checks (compatible with both Firebase web and RN). */
export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
}

/**
 * Check whether the current user is a signed-in (non-anonymous) user
 * with a valid token.
 *
 * Use this as the `enabled` option for React Query hooks that hit
 * user info endpoints (e.g. user profile, siteAdmin status) which
 * require a real account and return 403 for anonymous users.
 *
 * Note: do NOT use this for subscription or gamification endpoints —
 * anonymous users on mobile can still have subscriptions via
 * App Store / Play Store.
 *
 * @example
 * ```ts
 * const { data } = useSudojoUser(networkClient, baseUrl, token ?? '', user?.uid ?? '', {
 *   enabled: isAuthenticatedUser(user, token),
 * });
 * ```
 */
export function isAuthenticatedUser(
  user: AuthUser | null | undefined,
  token: string | null | undefined
): boolean {
  return !!user?.uid && !!token && !user.isAnonymous;
}
