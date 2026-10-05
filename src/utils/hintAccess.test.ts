/**
 * Tests for hint access utilities
 */

import { describe, expect, it } from 'vitest';
import {
  FREE_HINT_STEP_LIMIT,
  getHintAccessAction,
  HINT_ACCESS_KEY_SUFFIXES,
} from './hintAccess';

describe('getHintAccessAction', () => {
  it('maps each user state to an action and message', () => {
    expect(getHintAccessAction({ userState: 'anonymous' })).toEqual({
      action: 'sign_in',
      variant: 'login',
    });
    expect(getHintAccessAction({ userState: 'no_subscription' })).toEqual({
      action: 'subscribe',
      variant: 'subscription',
    });
    expect(getHintAccessAction({ userState: 'insufficient_tier' })).toEqual({
      action: 'subscribe',
      variant: 'upgrade',
    });
    expect(getHintAccessAction({ userState: 'something_else' })).toEqual({
      action: 'dismiss',
      variant: 'unavailable',
    });
    expect(getHintAccessAction(null).action).toBe('dismiss');
  });

  it('exposes the free step limit and key suffixes', () => {
    expect(FREE_HINT_STEP_LIMIT).toBe(2);
    expect(HINT_ACCESS_KEY_SUFFIXES.upgrade.button).toBe('upgradeButton');
  });
});
