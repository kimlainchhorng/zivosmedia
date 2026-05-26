/** Pricing config stubs */

export type ProductType = "flights" | "hotels" | "cars";

export const FEE_DISCLOSURE = {
  main: "Service fees may apply. Final price confirmed at checkout.",
  noHiddenFees: "No hidden fees — what you see is what you pay.",
  currency: "Prices shown in your selected currency. Exchange rates may vary.",
  flights: "Flight prices include taxes and fees as provided by the airline.",
  hotels: "Hotel prices include taxes as provided by the property.",
  cars: "Car rental prices include base rate. Insurance and extras may apply.",
};

export const CHECKOUT_TERMS = {
  errorMessage: "Please accept the required terms to continue.",
  confirmationCopy: "By completing this booking, you agree to the terms above.",
};

export function getBookingServiceFee(_productType: ProductType) {
  return { amount: 0, currency: "USD" };
}

export function formatPrice(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateMarkup(basePrice: number, _productType?: ProductType, _extra?: any): number {
  return basePrice;
}
