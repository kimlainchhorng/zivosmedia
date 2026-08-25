/**
 * Canonical conversion rate for legacy ZivosMedia Ride/KHQR money paths.
 *
 * Keep this aligned with `src/lib/currency.ts` and the dedicated Rider,
 * Driver, and Admin apps. Zivo-Admin's Ride ecosystem contract scans both
 * browser source and Edge Functions so a second rate cannot drift silently.
 */
export const KHR_PER_USD = 4100;
