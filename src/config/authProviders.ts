/**
 * Shared auth provider configuration
 *
 * Single source of truth for which authentication providers are enabled
 * across all Sudojo apps (web and mobile).
 */

/** Available authentication provider types */
export type AuthProviderType = 'google' | 'apple' | 'email';

/** Configuration for enabled auth providers */
export interface AuthProvidersConfig {
  /** Which providers to enable */
  providers: AuthProviderType[];
  /** Enable anonymous sign-in fallback */
  enableAnonymous?: boolean;
}

/** Default auth providers config used by all apps */
export const DEFAULT_AUTH_PROVIDERS: AuthProvidersConfig = {
  providers: ['google', 'email'],
  enableAnonymous: true,
};
