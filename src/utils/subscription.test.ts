/**
 * Tests for subscription utilities
 */

import { describe, expect, it } from 'vitest';
import {
  calculateSavingsPercent,
  canDeleteAccount,
  convertPackageToProduct,
  getPeriodDisplayName,
  getPeriodLabel,
  getPeriodLabelKey,
  getPuzzleDistribution,
  getRevenueCatErrorMessage,
  isBestValuePlan,
  isBestValueProduct,
  isCrossPlatformSubscription,
  parseCustomerInfo,
  subscriptionPeriodToMonths,
} from './subscription';

describe('convertPackageToProduct', () => {
  it('converts a minimal package', () => {
    const product = convertPackageToProduct({
      identifier: '$rc_monthly',
    });

    expect(product.identifier).toBe('$rc_monthly');
    expect(product.price).toBe('0');
    expect(product.priceString).toBe('$0');
    expect(product.title).toBe('$rc_monthly');
    expect(product.description).toBe('');
  });

  it('converts a full package with all properties', () => {
    const product = convertPackageToProduct({
      identifier: '$rc_annual',
      rcBillingProduct: {
        identifier: 'com.sudobility.annual',
        title: 'Annual Plan',
        description: 'Best value plan',
        currentPrice: {
          amountMicros: 49990000,
          formattedPrice: '$49.99',
        },
        normalPeriodDuration: 'P1Y',
        defaultSubscriptionOption: {
          introPrice: {
            price: {
              formattedPrice: '$24.99',
            },
            periodDuration: 'P3M',
          },
          trial: {
            periodDuration: 'P7D',
          },
        },
      },
    });

    expect(product.identifier).toBe('$rc_annual');
    expect(product.productId).toBe('com.sudobility.annual');
    expect(product.price).toBe('49.99');
    expect(product.priceString).toBe('$49.99');
    expect(product.title).toBe('Annual Plan');
    expect(product.description).toBe('Best value plan');
    expect(product.period).toBe('P1Y');
    expect(product.introPrice).toBe('$24.99');
    expect(product.introPricePeriod).toBe('P3M');
    expect(product.freeTrialPeriod).toBe('P7D');
  });

  it('handles package without price', () => {
    const product = convertPackageToProduct({
      identifier: '$rc_monthly',
      rcBillingProduct: {
        title: 'Monthly Plan',
      },
    });

    expect(product.price).toBe('0');
    expect(product.priceString).toBe('$0');
  });
});

describe('parseCustomerInfo', () => {
  it('returns inactive subscription for empty entitlements', () => {
    const subscription = parseCustomerInfo({
      entitlements: { active: {} },
    });

    expect(subscription.isActive).toBe(false);
    expect(subscription.expirationDate).toBeUndefined();
  });

  it('returns active subscription with full details', () => {
    const expDate = Date.now() + 86400000; // Tomorrow
    const purchDate = Date.now() - 86400000; // Yesterday

    const subscription = parseCustomerInfo({
      entitlements: {
        active: {
          premium: {
            expirationDate: expDate,
            latestPurchaseDate: purchDate,
            productIdentifier: 'com.sudobility.annual',
            willRenew: true,
          },
        },
      },
    });

    expect(subscription.isActive).toBe(true);
    expect(subscription.expirationDate).toBeInstanceOf(Date);
    expect(subscription.expirationDate?.getTime()).toBe(expDate);
    expect(subscription.purchaseDate).toBeInstanceOf(Date);
    expect(subscription.purchaseDate?.getTime()).toBe(purchDate);
    expect(subscription.productIdentifier).toBe('com.sudobility.annual');
    expect(subscription.willRenew).toBe(true);
  });

  it('handles entitlement with null expiration date', () => {
    const subscription = parseCustomerInfo({
      entitlements: {
        active: {
          premium: {
            expirationDate: null,
            willRenew: false,
          },
        },
      },
    });

    expect(subscription.isActive).toBe(true);
    expect(subscription.expirationDate).toBeUndefined();
    expect(subscription.willRenew).toBe(false);
  });
});

describe('getPeriodDisplayName', () => {
  it('returns display names for known periods', () => {
    expect(getPeriodDisplayName('P1W')).toBe('Weekly');
    expect(getPeriodDisplayName('P1M')).toBe('Monthly');
    expect(getPeriodDisplayName('P3M')).toBe('Quarterly');
    expect(getPeriodDisplayName('P6M')).toBe('Semi-Annual');
    expect(getPeriodDisplayName('P1Y')).toBe('Annual');
    expect(getPeriodDisplayName('P12M')).toBe('Annual');
  });

  it('returns the raw period for unknown periods', () => {
    expect(getPeriodDisplayName('P2W')).toBe('P2W');
    expect(getPeriodDisplayName('P2Y')).toBe('P2Y');
  });

  it('returns empty string for undefined', () => {
    expect(getPeriodDisplayName(undefined)).toBe('');
  });
});

describe('isBestValuePlan', () => {
  it('returns true for annual plans', () => {
    expect(isBestValuePlan('P1Y')).toBe(true);
    expect(isBestValuePlan('P12M')).toBe(true);
  });

  it('returns false for non-annual plans', () => {
    expect(isBestValuePlan('P1M')).toBe(false);
    expect(isBestValuePlan('P3M')).toBe(false);
    expect(isBestValuePlan('P1W')).toBe(false);
    expect(isBestValuePlan(undefined)).toBe(false);
  });
});

describe('getRevenueCatErrorMessage', () => {
  it('returns appropriate messages for known error codes', () => {
    expect(getRevenueCatErrorMessage(1)).toBe('Purchase cancelled');
    expect(getRevenueCatErrorMessage(2)).toBe(
      'Store problem occurred. Please try again later.'
    );
    expect(getRevenueCatErrorMessage(3)).toBe(
      'Purchase not allowed on this device'
    );
    expect(getRevenueCatErrorMessage(7)).toBe(
      'Network error. Please check your connection.'
    );
  });

  it('returns generic message for unknown error codes', () => {
    expect(getRevenueCatErrorMessage(0)).toBe(
      'Purchase failed. Please try again.'
    );
    expect(getRevenueCatErrorMessage(99)).toBe(
      'Purchase failed. Please try again.'
    );
  });
});

describe('getPeriodLabelKey / getPeriodLabel', () => {
  it('maps ISO and named periods to unit keys', () => {
    expect(getPeriodLabelKey('P1W')).toBe('periods.week');
    expect(getPeriodLabelKey('P1M')).toBe('periods.month');
    expect(getPeriodLabelKey('P3M')).toBe('periods.quarter');
    expect(getPeriodLabelKey('P6M')).toBe('periods.halfYear');
    expect(getPeriodLabelKey('P1Y')).toBe('periods.year');
    expect(getPeriodLabelKey('P12M')).toBe('periods.year');
    expect(getPeriodLabelKey('yearly')).toBe('periods.year');
    expect(getPeriodLabelKey('monthly')).toBe('periods.month');
    expect(getPeriodLabelKey('P2Y')).toBeNull();
    expect(getPeriodLabelKey(undefined)).toBeNull();
  });

  it('builds the price suffix', () => {
    const t = (key: string) => key.split('.')[1] ?? key;
    expect(getPeriodLabel(t, 'P1M')).toBe('/month');
    expect(getPeriodLabel(t, 'lifetime')).toBe('');
  });
});

describe('isBestValueProduct', () => {
  it('matches annual periods and annual/yearly identifiers', () => {
    expect(isBestValueProduct({ period: 'P1Y', identifier: 'x' })).toBe(true);
    expect(isBestValueProduct({ period: 'P12M' })).toBe(true);
    expect(isBestValueProduct({ period: 'yearly' })).toBe(true);
    expect(isBestValueProduct({ identifier: 'sudojo_annual' })).toBe(true);
    expect(isBestValueProduct({ identifier: 'Pro_Yearly' })).toBe(true);
    expect(isBestValueProduct({ period: 'P1M', identifier: 'monthly' })).toBe(
      false
    );
  });
});

describe('subscriptionPeriodToMonths', () => {
  it('handles named and ISO periods', () => {
    expect(subscriptionPeriodToMonths('weekly')).toBe(0.25);
    expect(subscriptionPeriodToMonths('monthly')).toBe(1);
    expect(subscriptionPeriodToMonths('quarterly')).toBe(3);
    expect(subscriptionPeriodToMonths('yearly')).toBe(12);
    expect(subscriptionPeriodToMonths('lifetime')).toBe(Infinity);
    expect(subscriptionPeriodToMonths('P6M')).toBe(6);
    expect(subscriptionPeriodToMonths('P1Y')).toBe(12);
    expect(subscriptionPeriodToMonths('P1W')).toBe(0.25);
    expect(subscriptionPeriodToMonths('bogus')).toBeNull();
    expect(subscriptionPeriodToMonths(null)).toBeNull();
  });
});

describe('calculateSavingsPercent', () => {
  const monthly = { price: 10, period: 'monthly' };
  it('computes the monthly saving, rounded', () => {
    expect(
      calculateSavingsPercent(monthly, { price: 60, period: 'yearly' })
    ).toBe(50);
    expect(
      calculateSavingsPercent(monthly, { price: 100, period: 'P1Y' })
    ).toBe(17);
  });

  it('returns null when not comparable or no saving', () => {
    expect(calculateSavingsPercent(monthly, monthly)).toBeNull();
    expect(
      calculateSavingsPercent(monthly, { price: 200, period: 'yearly' })
    ).toBeNull();
    expect(
      calculateSavingsPercent(monthly, { price: 99, period: 'lifetime' })
    ).toBeNull();
    expect(
      calculateSavingsPercent(
        { price: 0, period: 'monthly' },
        {
          price: 60,
          period: 'yearly',
        }
      )
    ).toBeNull();
    expect(calculateSavingsPercent(null, monthly)).toBeNull();
    expect(
      calculateSavingsPercent(monthly, { price: 1, period: undefined })
    ).toBeNull();
  });
});

describe('isCrossPlatformSubscription', () => {
  it('is true only when both platforms are known and differ', () => {
    expect(isCrossPlatformSubscription('ios', 'android')).toBe(true);
    expect(isCrossPlatformSubscription('ios', 'ios')).toBe(false);
    expect(isCrossPlatformSubscription(null, 'ios')).toBe(false);
    expect(isCrossPlatformSubscription('web', undefined)).toBe(false);
  });
});

describe('canDeleteAccount', () => {
  it('requires a real account and no active subscription', () => {
    expect(
      canDeleteAccount({ user: { uid: 'u' }, subscriptionActive: false })
    ).toEqual({ allowed: true });
    expect(canDeleteAccount({ user: null, subscriptionActive: false })).toEqual(
      { allowed: false, reason: 'not_signed_in' }
    );
    expect(
      canDeleteAccount({
        user: { uid: 'u', isAnonymous: true },
        subscriptionActive: false,
      })
    ).toEqual({ allowed: false, reason: 'anonymous' });
    expect(
      canDeleteAccount({ user: { uid: 'u' }, subscriptionActive: true })
    ).toEqual({ allowed: false, reason: 'active_subscription' });
  });
});

describe('getPuzzleDistribution', () => {
  const levels = [
    { entitlement: null, percentage: 0.5 },
    { entitlement: 'blue_belt,red_belt', percentage: 0.3 },
    { entitlement: 'red_belt', percentage: 0.2 },
  ];
  it('sums free levels without an offer', () => {
    expect(getPuzzleDistribution(levels)).toBeCloseTo(0.5);
  });
  it('adds blue belt levels for the blue belt offer', () => {
    expect(getPuzzleDistribution(levels, '1_blue_belt')).toBeCloseTo(0.8);
  });
  it('is 1 for any other offer', () => {
    expect(getPuzzleDistribution(levels, '2_red_belt')).toBe(1);
  });
});
