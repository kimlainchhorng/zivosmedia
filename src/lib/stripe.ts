/**
 * Stripe Configuration
 * Stripe publishable key for client-side usage.
 *
 * Env-driven so a hardcoded LIVE key is never shipped. Set
 * VITE_STRIPE_PUBLISHABLE_KEY to a test publishable key for sandbox/test (or a
 * live publishable key once live payments are explicitly approved). Publishable
 * keys are safe to expose in the frontend. If unset, Stripe is disabled
 * (fails safe) rather than falling back to live.
 */
import { loadStripe } from '@stripe/stripe-js';

export const STRIPE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

// Singleton stripe promise
let stripePromise: Promise<import('@stripe/stripe-js').Stripe | null> | null = null;

export const getStripe = () => {
  if (!STRIPE_PUBLISHABLE_KEY) {
    // No key configured — keep Stripe disabled instead of using a live key.
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};
