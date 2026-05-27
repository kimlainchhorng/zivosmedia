/**
 * Hizovo SubID Generator
 * 
 * STANDARDIZED TRACKING FORMAT:
 * utm_source=hizovo
 * utm_medium=affiliate
 * utm_campaign=travel
 * subid={searchSessionId}
 * 
 * The subid links: search → click → booking for attribution
 * Format: SS_{timestamp}_{random} (e.g., SS_839201)
 */

import { format } from 'date-fns';
import { getSearchSessionId } from '@/config/trackingParams';

// Maximum SubID length (Travelpayouts limit is typically 100-200 chars)
const MAX_SUBID_LENGTH = 100;

export interface UTMParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  creator?: string | null;
  subid?: string | null; // Custom subid override
}

export interface SubIDComponents {
  product: string;
  page: string;
  partner: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  creator: string;
  date: string;
}

/**
 * Sanitize a string for use in SubID
 * - Lowercase
 * - Replace spaces and special chars with underscores
 * - Truncate to max length
 */
function sanitize(value: string | null | undefined, maxLength: number = 20): string {
  if (!value) return 'none';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, maxLength) || 'none';
}

/**
 * Get UTM parameters from current URL
 */
export function getUTMParamsFromURL(): UTMParams {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    creator: params.get('creator'),
    subid: params.get('subid'),
  };
}

/**
 * Store UTM parameters in session storage for persistence across page navigations
 */
export function persistUTMParams(params: UTMParams): void {
  if (typeof window === 'undefined') return;
  
  const existing = getPersistedUTMParams();
  const merged = { ...existing, ...params };
  
  // Only store non-null values
  const toStore: Record<string, string> = {};
  Object.entries(merged).forEach(([key, value]) => {
    if (value) toStore[key] = value;
  });
  
  sessionStorage.setItem('hizovo_utm_params', JSON.stringify(toStore));
}

/**
 * Get persisted UTM parameters from session storage
 */
export function getPersistedUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = sessionStorage.getItem('hizovo_utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Initialize UTM tracking - call on app load
 * Merges URL params with persisted params (URL takes precedence)
 */
export function initUTMTracking(): UTMParams {
  const urlParams = getUTMParamsFromURL();
  const persistedParams = getPersistedUTMParams();
  
  // URL params override persisted params
  const merged = { ...persistedParams, ...urlParams };
  
  // Persist the merged params
  persistUTMParams(merged);
  
  return merged;
}

/**
 * Generate SubID for affiliate tracking
 * 
 * NEW FORMAT: Uses search session ID for direct attribution
 * Format: {searchSessionId} (e.g., SS_1706789012345_ABC123)
 * 
 * Legacy format (still supported): {product}.{page}.{partner}.{source}.{campaign}.{creator}.{date}
 */
export function generateSubID(
  product: string,
  page: string,
  utmParams?: UTMParams,
  partnerId?: string
): { subid: string; components: SubIDComponents } {
  const params = utmParams || getPersistedUTMParams();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const components: SubIDComponents = {
    product: sanitize(product, 15),
    page: sanitize(page, 20),
    partner: sanitize(partnerId, 15),
    utm_source: sanitize(params.utm_source, 15),
    utm_medium: sanitize(params.utm_medium, 10),
    utm_campaign: sanitize(params.utm_campaign, 20),
    utm_content: sanitize(params.utm_content, 15),
    utm_term: sanitize(params.utm_term, 15),
    creator: sanitize(params.creator, 15),
    date: today,
  };
  
  // Use standardized search session ID as subid for direct attribution
  // This matches the format: subid=SS_839201
  const searchSessionId = getSearchSessionId();
  
  return { subid: searchSessionId, components };
}

/**
 * Partner SubID parameter mapping
 * Different partners use different parameter names
 */
export const PARTNER_SUBID_PARAMS: Record<string, string> = {
  // Travelpayouts partners
  searadar: 'subid',
  aviasales: 'subid',
  hotellook: 'subid',
  economybookings: 'subid',
  qeeq: 'subid',
  getrentacar: 'subid',
  kiwitaxi: 'subid',
  gettransfer: 'subid',
  intui: 'subid',
  tiqets: 'subid',
  wegotrip: 'subid',
  ticketnetwork: 'subid',
  airalo: 'subid',
  drimsim: 'subid',
  yesim: 'subid',
  radicalstorage: 'subid',
  airhelp: 'subid',
  compensair: 'subid',
  ektatraveling: 'subid',
  // Default
  default: 'subid',
};

/**
 * Get the SubID parameter name for a partner
 */
export function getSubIDParamName(partnerId: string): string {
  return PARTNER_SUBID_PARAMS[partnerId.toLowerCase()] || PARTNER_SUBID_PARAMS.default;
}

/**
 * Append SubID to a partner URL
 */
export function appendSubIDToURL(url: string, subid: string, partnerId: string): string {
  try {
    const urlObj = new URL(url);
    const paramName = getSubIDParamName(partnerId);
    urlObj.searchParams.set(paramName, subid);
    return urlObj.toString();
  } catch {
    // If URL parsing fails, append manually
    const separator = url.includes('?') ? '&' : '?';
    const paramName = getSubIDParamName(partnerId);
    return `${url}${separator}${paramName}=${encodeURIComponent(subid)}`;
  }
}
