/**
 * ZIVO Flight Booking Mode Configuration
 * 
 * FLIGHTS_MODE determines how flight bookings are handled:
 * - OTA_ONLY: All bookings through ZIVO + Duffel (no affiliate)
 * - AFFILIATE: Legacy affiliate redirect mode (DEPRECATED)
 * 
 * This is a LOCKED configuration - affiliate mode is permanently disabled.
 * ZIVO operates as the Merchant of Record for all flight bookings.
 */

export const FLIGHTS_MODE = 'OTA_ONLY' as const;

export type FlightsMode = 'OTA_ONLY' | 'AFFILIATE';

/**
 * Check if flights are in OTA-only mode
 * This should ALWAYS return true for production
 */
export function isFlightsOTAMode(): boolean {
  return FLIGHTS_MODE === 'OTA_ONLY';
}

/**
 * Guard function - throws error if affiliate code attempts to run
 * Use in any legacy affiliate function for safety
 */
export function assertOTAMode(context: string): void {
  if (FLIGHTS_MODE !== 'OTA_ONLY') {
    console.error(`[SECURITY] Affiliate mode attempted in: ${context}`);
    throw new Error('Affiliate mode is disabled. ZIVO operates in OTA-only mode.');
  }
}

/**
 * Safe guard for affiliate functions - returns false to prevent execution
 * Use in conditionals before affiliate logic
 */
export function canUseAffiliateForFlights(): boolean {
  return false; // LOCKED: Always return false
}

/**
 * Log blocked affiliate attempt for monitoring
 */
export function logBlockedAffiliateAttempt(source: string, action: string): void {
  console.warn(`[OTA_MODE] Blocked affiliate ${action} from ${source}. Flights operate in OTA-only mode.`);
}
