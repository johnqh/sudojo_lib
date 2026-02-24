/**
 * Tests for subscription utilities
 */

import { describe, expect, it } from 'vitest';
import {
  convertPackageToProduct,
  getPeriodDisplayName,
  getRevenueCatErrorMessage,
  isBestValuePlan,
  parseCustomerInfo,
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
