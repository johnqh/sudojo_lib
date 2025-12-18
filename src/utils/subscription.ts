/**
 * Subscription utilities
 *
 * These functions work with RevenueCat SDK types to convert to our domain models.
 * The RevenueCat types are passed as generics to avoid direct SDK dependency.
 */

import type { Product, Subscription } from '../types/subscription';

/** RevenueCat Package shape (simplified) */
interface RevenueCatPackage {
  identifier: string;
  rcBillingProduct?: {
    identifier?: string;
    title?: string;
    description?: string;
    currentPrice?: {
      amountMicros?: number;
      formattedPrice?: string;
    };
    normalPeriodDuration?: string;
    defaultSubscriptionOption?: {
      introPrice?: {
        price?: {
          formattedPrice?: string;
        };
        periodDuration?: string;
      };
      trial?: {
        periodDuration?: string;
      };
    };
  };
}

/** RevenueCat CustomerInfo entitlement shape */
interface RevenueCatEntitlement {
  expirationDate?: number | null;
  latestPurchaseDate?: number | null;
  productIdentifier?: string;
  willRenew?: boolean;
}

/** RevenueCat CustomerInfo shape (simplified) */
interface RevenueCatCustomerInfo {
  entitlements: {
    active: Record<string, RevenueCatEntitlement>;
  };
}

/**
 * Convert RevenueCat package to our Product interface
 *
 * @param pkg - RevenueCat package
 * @returns Product object
 */
export function convertPackageToProduct(pkg: RevenueCatPackage): Product {
  const product = pkg.rcBillingProduct;
  const subscriptionOption = product?.defaultSubscriptionOption;

  const result: Product = {
    identifier: pkg.identifier,
    price: product?.currentPrice?.amountMicros
      ? (product.currentPrice.amountMicros / 1000000).toFixed(2)
      : '0',
    priceString: product?.currentPrice?.formattedPrice ?? '$0',
    title: product?.title ?? pkg.identifier,
    description: product?.description ?? '',
  };

  if (product?.identifier !== undefined) {
    result.productId = product.identifier;
  }
  if (product?.normalPeriodDuration !== undefined) {
    result.period = product.normalPeriodDuration;
  }
  if (subscriptionOption?.introPrice?.price?.formattedPrice !== undefined) {
    result.introPrice = subscriptionOption.introPrice.price.formattedPrice;
  }
  if (subscriptionOption?.introPrice?.periodDuration !== undefined) {
    result.introPricePeriod = subscriptionOption.introPrice.periodDuration;
  }
  if (subscriptionOption?.trial?.periodDuration !== undefined) {
    result.freeTrialPeriod = subscriptionOption.trial.periodDuration;
  }

  return result;
}

/**
 * Parse RevenueCat CustomerInfo into our Subscription interface
 *
 * @param customerInfo - RevenueCat customer info
 * @returns Subscription object
 */
export function parseCustomerInfo(
  customerInfo: RevenueCatCustomerInfo
): Subscription {
  const hasActiveEntitlement =
    Object.keys(customerInfo.entitlements.active).length > 0;
  const activeEntitlement = Object.values(customerInfo.entitlements.active)[0];

  if (hasActiveEntitlement && activeEntitlement) {
    const subscription: Subscription = { isActive: true };

    if (activeEntitlement.expirationDate != null) {
      subscription.expirationDate = new Date(activeEntitlement.expirationDate);
    }
    if (activeEntitlement.latestPurchaseDate != null) {
      subscription.purchaseDate = new Date(
        activeEntitlement.latestPurchaseDate
      );
    }
    if (activeEntitlement.productIdentifier !== undefined) {
      subscription.productIdentifier = activeEntitlement.productIdentifier;
    }
    if (activeEntitlement.willRenew !== undefined) {
      subscription.willRenew = activeEntitlement.willRenew;
    }

    return subscription;
  }

  return { isActive: false };
}

/**
 * Get display name for subscription period
 *
 * @param period - ISO 8601 duration string (e.g., "P1M", "P1Y")
 * @returns Human-readable period name
 */
export function getPeriodDisplayName(period: string | undefined): string {
  if (!period) return '';

  const periodMap: Record<string, string> = {
    P1W: 'Weekly',
    P1M: 'Monthly',
    P3M: 'Quarterly',
    P6M: 'Semi-Annual',
    P1Y: 'Annual',
    P12M: 'Annual',
  };

  return periodMap[period] ?? period;
}

/**
 * Check if a plan is the "best value" (typically annual plans)
 *
 * @param period - ISO 8601 duration string
 * @returns Whether this is typically the best value option
 */
export function isBestValuePlan(period: string | undefined): boolean {
  return period === 'P1Y' || period === 'P12M';
}

/**
 * Get RevenueCat purchase error message
 *
 * @param errorCode - RevenueCat error code
 * @returns User-friendly error message
 */
export function getRevenueCatErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case 1:
      return 'Purchase cancelled';
    case 2:
      return 'Store problem occurred. Please try again later.';
    case 3:
      return 'Purchase not allowed on this device';
    case 7:
      return 'Network error. Please check your connection.';
    default:
      return 'Purchase failed. Please try again.';
  }
}
