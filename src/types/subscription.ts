/**
 * Subscription types and domain models
 */

/** Subscription product information */
export interface Product {
  identifier: string;
  productId?: string;
  price: string;
  priceString: string;
  title: string;
  description: string;
  period?: string;
  introPrice?: string;
  introPricePeriod?: string;
  freeTrialPeriod?: string;
}

/** User subscription status */
export interface Subscription {
  isActive: boolean;
  expirationDate?: Date;
  purchaseDate?: Date;
  productIdentifier?: string;
  willRenew?: boolean;
}

/** Default inactive subscription */
export const DEFAULT_SUBSCRIPTION: Subscription = {
  isActive: false,
};
