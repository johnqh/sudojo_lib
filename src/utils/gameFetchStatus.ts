/**
 * Status of a game fetch (useLevelGame / useDailyGame): which screen to show.
 */

/** Game fetch status indicating what screen to show */
export type GameFetchStatus =
  | 'loading'
  | 'success'
  | 'auth_required'
  | 'subscription_required'
  | 'entitlement_required'
  | 'error';

/**
 * API response with the optional `action` field older Sudojo API deployments
 * attached to gated responses.
 */
export interface GameFetchResponse {
  success: boolean;
  data?: unknown;
  action?: {
    type: string;
    options?: string[];
  };
}

function errorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    return (error as { message?: string }).message;
  }
  return undefined;
}

/**
 * Whether a response or error says the user must sign in.
 *
 * Legacy: the current sudojo_api never sends `action: { type: 'auth_required' }`
 * or an "Account required" message (its puzzle and daily GETs are public), so
 * this is false against it. Kept for older deployments; not provably
 * unreachable, because `error` can be anything the network layer throws.
 */
export function isAuthRequiredResponse(
  response: GameFetchResponse | null | undefined,
  error: unknown
): boolean {
  if (
    response?.success === false &&
    response.action?.type === 'auth_required'
  ) {
    return true;
  }
  return errorMessage(error)?.includes('Account required') ?? false;
}

/**
 * Whether a response or error says a subscription is required.
 *
 * Legacy: the current sudojo_api never sends
 * `action: { type: 'subscription_required' }` or "Daily limit reached" (its
 * daily-limit gate was deleted). The `'subscription'` substring check still
 * matches any error message containing that word, so it is kept.
 */
export function isSubscriptionRequiredResponse(
  response: GameFetchResponse | null | undefined,
  error: unknown
): boolean {
  if (
    response?.success === false &&
    response.action?.type === 'subscription_required'
  ) {
    return true;
  }
  const message = errorMessage(error);
  return (
    (message?.includes('Daily limit reached') ||
      message?.includes('subscription')) ??
    false
  );
}

/**
 * Derive the fetch status for a game query, in priority order:
 * entitlement denied, loading, auth required, subscription required, error,
 * success (a successful response with data), otherwise still loading.
 */
export function getGameFetchStatus(state: {
  isLoading: boolean;
  response: GameFetchResponse | null | undefined;
  error: unknown;
  entitlementDenied?: boolean;
}): GameFetchStatus {
  const { isLoading, response, error, entitlementDenied = false } = state;
  if (entitlementDenied) return 'entitlement_required';
  if (isLoading) return 'loading';
  if (isAuthRequiredResponse(response, error)) return 'auth_required';
  if (isSubscriptionRequiredResponse(response, error)) {
    return 'subscription_required';
  }
  if (error) return 'error';
  if (response?.success && response.data) return 'success';
  return 'loading';
}

/**
 * HTTP status carried by an error, when it has one. The apps' network
 * clients throw a NetworkError (`@sudobility/types`) with a numeric `status`
 * for non-2xx responses.
 */
export function getErrorHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

/** Status of a practice fetch (usePracticeGame): which screen to show. */
export type PracticeFetchStatus =
  | 'loading'
  | 'ready'
  | 'auth_required'
  | 'subscription_required'
  | 'no_practices'
  | 'error';

/**
 * Derive the practice fetch status (web PracticePage / RN PracticeScreen):
 * - error: HTTP 401 -> auth_required, 402 -> subscription_required, any other
 *   status -> error; an error without a status falls back to its message
 *   ('401'/'auth' -> auth_required, '402'/'subscription' ->
 *   subscription_required)
 * - `success: false` with "No practices found" -> no_practices, else error
 * - a practice -> ready; a successful response without one -> no_practices
 * - otherwise loading
 */
export function getPracticeFetchStatus(state: {
  isLoading: boolean;
  response:
    | { success: boolean; data?: unknown; error?: string | null | undefined }
    | null
    | undefined;
  error: unknown;
}): PracticeFetchStatus {
  const { isLoading, response, error } = state;
  if (isLoading) return 'loading';
  if (error) {
    const httpStatus = getErrorHttpStatus(error);
    if (httpStatus === 401) return 'auth_required';
    if (httpStatus === 402) return 'subscription_required';
    if (httpStatus === undefined) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('401') || message.includes('auth')) {
        return 'auth_required';
      }
      if (message.includes('402') || message.includes('subscription')) {
        return 'subscription_required';
      }
    }
    return 'error';
  }
  if (response?.success === false) {
    return response.error?.includes('No practices found')
      ? 'no_practices'
      : 'error';
  }
  if (response?.success) return response.data ? 'ready' : 'no_practices';
  return 'loading';
}
