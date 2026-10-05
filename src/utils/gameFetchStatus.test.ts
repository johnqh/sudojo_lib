/**
 * Tests for game fetch status utilities
 */

import { describe, expect, it } from 'vitest';
import {
  getGameFetchStatus,
  isAuthRequiredResponse,
  isSubscriptionRequiredResponse,
} from './gameFetchStatus';

describe('legacy gating signals', () => {
  it('detects the action field', () => {
    expect(
      isAuthRequiredResponse(
        { success: false, action: { type: 'auth_required' } },
        null
      )
    ).toBe(true);
    expect(
      isSubscriptionRequiredResponse(
        { success: false, action: { type: 'subscription_required' } },
        null
      )
    ).toBe(true);
  });

  it('detects error messages', () => {
    expect(isAuthRequiredResponse(null, new Error('Account required'))).toBe(
      true
    );
    expect(
      isSubscriptionRequiredResponse(null, new Error('Daily limit reached'))
    ).toBe(true);
    expect(
      isSubscriptionRequiredResponse(null, { message: 'needs subscription' })
    ).toBe(true);
    expect(isAuthRequiredResponse(null, new Error('boom'))).toBe(false);
    expect(isSubscriptionRequiredResponse(null, 'string error')).toBe(false);
  });
});

describe('getGameFetchStatus', () => {
  const ok = { success: true, data: { board: '0' } };
  it('applies the priority order', () => {
    expect(
      getGameFetchStatus({
        isLoading: true,
        response: ok,
        error: null,
        entitlementDenied: true,
      })
    ).toBe('entitlement_required');
    expect(
      getGameFetchStatus({ isLoading: true, response: ok, error: null })
    ).toBe('loading');
    expect(
      getGameFetchStatus({
        isLoading: false,
        response: undefined,
        error: new Error('Account required'),
      })
    ).toBe('auth_required');
    expect(
      getGameFetchStatus({
        isLoading: false,
        response: undefined,
        error: new Error('Daily limit reached'),
      })
    ).toBe('subscription_required');
    expect(
      getGameFetchStatus({
        isLoading: false,
        response: undefined,
        error: new Error('boom'),
      })
    ).toBe('error');
    expect(
      getGameFetchStatus({ isLoading: false, response: ok, error: null })
    ).toBe('success');
    expect(
      getGameFetchStatus({
        isLoading: false,
        response: { success: false },
        error: null,
      })
    ).toBe('loading');
  });
});
