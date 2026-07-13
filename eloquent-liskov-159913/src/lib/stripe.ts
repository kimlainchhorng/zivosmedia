/**
 * Stripe Configuration
 * Stripe publishable key for client-side usage
 */
import { loadStripe } from '@stripe/stripe-js';

// Publishable key (safe to expose in frontend)
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Stzp1QrpgPhUA5uEbfhsEXqg0JBPdluYSWudrUdp6XrfvQaZSVetKgFrfAp1hmq4f148EgEO3XBKCNp79AQcJ4B00mbtJpGLQ';

// Singleton stripe promise
let stripePromise: Promise<import('@stripe/stripe-js').Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};
