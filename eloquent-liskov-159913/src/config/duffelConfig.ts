/**
 * Duffel Environment Configuration
 * Provides helper routes for sandbox testing and environment detection
 * 
 * PRODUCTION MODE: DUFFEL_MODE=live (locked)
 * Strict validation enforced, no sandbox UI
 */

const DUFFEL_MODE = 'live' as const;

// Sandbox test routes (disabled in production)
export const DUFFEL_SANDBOX_ROUTES = [
  { from: 'LHR', to: 'CDG', label: 'London → Paris' },
  { from: 'SFO', to: 'LAX', label: 'San Francisco → Los Angeles' },
  { from: 'JFK', to: 'BOS', label: 'New York → Boston' },
  { from: 'LAX', to: 'SFO', label: 'Los Angeles → San Francisco' },
  { from: 'LHR', to: 'JFK', label: 'London → New York' },
  { from: 'CDG', to: 'AMS', label: 'Paris → Amsterdam' },
] as const;

/**
 * Check if we're in Duffel sandbox mode
 * In production, this always returns false
 */
export function isSandboxMode(): boolean {
  // Production mode is locked to live
  if (DUFFEL_MODE === 'live') {
    return false;
  }
  
  // Check sessionStorage (set from edge function response)
  const storedEnv = sessionStorage.getItem('duffel_env');
  if (storedEnv) {
    return storedEnv === 'sandbox' || storedEnv === 'test';
  }
  
  return false;
}

/**
 * Check if we're in Duffel LIVE mode
 * In production, this always returns true
 */
export function isLiveMode(): boolean {
  // Production mode is locked to live
  if (DUFFEL_MODE === 'live') {
    return true;
  }
  
  const stored = sessionStorage.getItem('duffel_env');
  return stored === 'live';
}

/**
 * Set the Duffel environment from edge function response
 */
export function setDuffelEnvironment(env: string): void {
  sessionStorage.setItem('duffel_env', env);
}

/**
 * Get current Duffel environment
 */
export function getDuffelEnvironment(): 'sandbox' | 'live' | 'unknown' {
  const stored = sessionStorage.getItem('duffel_env');
  if (stored === 'live') return 'live';
  if (stored === 'sandbox' || stored === 'test') return 'sandbox';
  return import.meta.env.MODE === 'development' ? 'sandbox' : 'unknown';
}

/**
 * Whether to show debug UI (only in sandbox mode + admin routes)
 * NEVER shows in production - DUFFEL_MODE=live disables this
 */
export function shouldShowDebugUI(): boolean {
  // Production mode = no debug UI ever
  if (DUFFEL_MODE === 'live') return false;
  return isSandboxMode();
}

/**
 * Whether to show sandbox-specific UI elements
 * Requires BOTH sandbox mode AND admin status
 * NEVER shows to regular users - admin routes only
 */
export function shouldShowSandboxUI(isAdmin: boolean): boolean {
  // Production mode = no sandbox UI ever
  if (DUFFEL_MODE === 'live') return false;
  return isSandboxMode() && isAdmin;
}

/**
 * Whether to enforce strict validation (live mode requires stricter checks)
 */
export function shouldEnforceStrictValidation(): boolean {
  return isLiveMode();
}
