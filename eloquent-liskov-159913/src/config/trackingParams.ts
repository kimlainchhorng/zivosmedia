/**
 * Hizovo Standardized Tracking Parameters
 * 
 * CRITICAL: Use this format everywhere for Duffel / CJ / Travelpayouts:
 * 
 * utm_source=hizovo
 * utm_medium=affiliate
 * utm_campaign=travel
 * subid={searchSessionId}
 * 
 * The subid links: search → click → booking for attribution
 */

// ============================================
// STANDARDIZED UTM PARAMETERS
// ============================================

export const HIZOVO_TRACKING_PARAMS = {
  utm_source: 'hizovo',
  utm_medium: 'affiliate',
  utm_campaign: 'travel',
} as const;

// ============================================
// SEARCH SESSION ID GENERATOR
// ============================================

/**
 * Generate a unique search session ID for tracking
 * Format: SS_{timestamp}_{random}
 */
export function generateSearchSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SS_${timestamp}_${random}`;
}

/**
 * Get or create a search session ID
 * Persists in sessionStorage for the current session
 */
export function getSearchSessionId(): string {
  const key = 'hizovo_search_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = generateSearchSessionId();
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * Create a new search session (call when user initiates a new search)
 */
export function createNewSearchSession(): string {
  const key = 'hizovo_search_session_id';
  const sessionId = generateSearchSessionId();
  sessionStorage.setItem(key, sessionId);
  return sessionId;
}

// ============================================
// TRACKING URL BUILDER
// ============================================

export interface TrackingUrlParams {
  baseUrl: string;
  searchSessionId?: string;
  additionalParams?: Record<string, string>;
}

/**
 * Build a tracked affiliate URL with standardized Hizovo parameters
 * 
 * Example output:
 * https://partner-checkout.com/book?utm_source=hizovo&utm_medium=affiliate&utm_campaign=travel&subid=SS_839201
 */
export function buildTrackedUrl({ 
  baseUrl, 
  searchSessionId,
  additionalParams = {}
}: TrackingUrlParams): string {
  try {
    const url = new URL(baseUrl);
    
    // Add standardized Hizovo tracking params
    url.searchParams.set('utm_source', HIZOVO_TRACKING_PARAMS.utm_source);
    url.searchParams.set('utm_medium', HIZOVO_TRACKING_PARAMS.utm_medium);
    url.searchParams.set('utm_campaign', HIZOVO_TRACKING_PARAMS.utm_campaign);
    
    // Add search session ID as subid
    const subid = searchSessionId || getSearchSessionId();
    url.searchParams.set('subid', subid);
    
    // Add any additional params
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    return url.toString();
  } catch {
    // Fallback for relative URLs or parsing errors
    const separator = baseUrl.includes('?') ? '&' : '?';
    const subid = searchSessionId || getSearchSessionId();
    const params = new URLSearchParams({
      ...HIZOVO_TRACKING_PARAMS,
      subid,
      ...additionalParams,
    });
    return `${baseUrl}${separator}${params.toString()}`;
  }
}

/**
 * Build tracking params as an object (for use with existing URL builders)
 */
export function getTrackingParams(searchSessionId?: string): Record<string, string> {
  return {
    ...HIZOVO_TRACKING_PARAMS,
    subid: searchSessionId || getSearchSessionId(),
  };
}

/**
 * Build tracking params as a query string
 */
export function getTrackingQueryString(searchSessionId?: string): string {
  const params = getTrackingParams(searchSessionId);
  return new URLSearchParams(params).toString();
}

// ============================================
// PARTNER-SPECIFIC TRACKING
// ============================================

export type TrackingPartner = 'duffel' | 'travelpayouts' | 'cj' | 'booking' | 'expedia' | 'other';

/**
 * Get tracking parameter names for specific partners
 * (Some partners use different param names)
 */
export const PARTNER_PARAM_NAMES: Record<TrackingPartner, {
  source: string;
  medium: string;
  campaign: string;
  subid: string;
}> = {
  duffel: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    subid: 'subid',
  },
  travelpayouts: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    subid: 'subid',
  },
  cj: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    subid: 'sid', // CJ often uses 'sid' for sub-affiliate ID
  },
  booking: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    subid: 'aid', // Booking.com affiliate ID param
  },
  expedia: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    subid: 'affcid', // Expedia affiliate campaign ID
  },
  other: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    subid: 'subid',
  },
};

/**
 * Build a tracked URL for a specific partner
 */
export function buildPartnerTrackedUrl(
  baseUrl: string,
  partner: TrackingPartner,
  searchSessionId?: string,
  additionalParams?: Record<string, string>
): string {
  try {
    const url = new URL(baseUrl);
    const paramNames = PARTNER_PARAM_NAMES[partner];
    const subid = searchSessionId || getSearchSessionId();
    
    url.searchParams.set(paramNames.source, HIZOVO_TRACKING_PARAMS.utm_source);
    url.searchParams.set(paramNames.medium, HIZOVO_TRACKING_PARAMS.utm_medium);
    url.searchParams.set(paramNames.campaign, HIZOVO_TRACKING_PARAMS.utm_campaign);
    url.searchParams.set(paramNames.subid, subid);
    
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  } catch {
    return buildTrackedUrl({ baseUrl, searchSessionId, additionalParams });
  }
}

// ============================================
// LOGGING & ANALYTICS
// ============================================

export interface TrackingLog {
  searchSessionId: string;
  partner: string;
  product: 'flights' | 'hotels' | 'cars';
  destinationUrl: string;
  trackedUrl: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Log a tracked click for analytics
 */
export function logTrackedClick(log: TrackingLog): void {
  // Store in session for debugging
  const logs = JSON.parse(sessionStorage.getItem('hizovo_tracking_logs') || '[]');
  logs.push(log);
  sessionStorage.setItem('hizovo_tracking_logs', JSON.stringify(logs.slice(-50))); // Keep last 50
  
}

/**
 * Get tracking logs for debugging
 */
export function getTrackingLogs(): TrackingLog[] {
  return JSON.parse(sessionStorage.getItem('hizovo_tracking_logs') || '[]');
}
