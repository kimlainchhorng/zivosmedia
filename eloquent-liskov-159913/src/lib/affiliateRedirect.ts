/**
 * ZIVO Affiliate Redirect System
 * 
 * Handles all affiliate redirections with proper tracking
 * Supports dynamic deep links with search parameters
 * 
 * NOTE: Flights are in OTA-only mode - affiliate redirects are DISABLED
 * for flights. ZIVO is the Merchant of Record for all flight bookings.
 */

import { 
  buildFlightDeepLink, 
  buildHotelDeepLink, 
  buildCarDeepLink,
  buildActivityDeepLink,
  AFFILIATE_LINKS,
  type FlightDeepLinkParams,
  type HotelDeepLinkParams,
  type CarDeepLinkParams,
  type ActivityDeepLinkParams,
} from '@/config/affiliateLinks';
import { trackAffiliateClick, getSessionId, getDeviceType } from './affiliateTracking';
import { isFlightsOTAMode, logBlockedAffiliateAttempt } from '@/config/flightBookingMode';

// ============================================
// REDIRECT FUNCTIONS
// ============================================

interface RedirectOptions {
  source: string;
  ctaType?: 'top_cta' | 'result_card' | 'sticky_cta' | 'compare_prices' | 'no_results_fallback' | 'partner_selector' | 'exit_intent' | 'cross_sell' | 'popular_route' | 'trending_deal';
}

/**
 * Redirect to flight partner with deep link parameters
 * 
 * @deprecated FLIGHTS ARE IN OTA-ONLY MODE
 * This function is disabled. Use internal ZIVO booking flow instead.
 * ZIVO is the Merchant of Record for all flight bookings via Duffel API.
 */
export function redirectToFlightPartner(
  params: FlightDeepLinkParams,
  options: RedirectOptions
) {
  // OTA MODE: Flight partner redirects are PERMANENTLY DISABLED
  if (isFlightsOTAMode()) {
    logBlockedAffiliateAttempt(options.source, 'redirectToFlightPartner');
    console.error('[OTA_MODE] redirectToFlightPartner is disabled. ZIVO is Merchant of Record.');
    return null;
  }

  // Legacy code below - NEVER executes in OTA mode
  const url = buildFlightDeepLink(params);
  
  // Track the click
  trackAffiliateClick({
    flightId: `flight-${params.origin}-${params.destination}-${Date.now()}`,
    airline: 'Multiple',
    airlineCode: 'ALL',
    origin: params.origin,
    destination: params.destination,
    price: 0, // Price will be shown on partner site
    passengers: params.passengers,
    cabinClass: params.cabinClass,
    affiliatePartner: 'searadar',
    referralUrl: url,
    source: options.source,
    ctaType: options.ctaType,
    serviceType: 'flights',
  });
  
  // Open in-app browser on native, new tab on web
  import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  
  return url;
}

/**
 * Redirect to hotel partner with deep link parameters
 */
export function redirectToHotelPartner(
  params: HotelDeepLinkParams,
  options: RedirectOptions
) {
  const url = buildHotelDeepLink(params);
  
  // Track the click
  trackAffiliateClick({
    flightId: `hotel-${params.destination}-${Date.now()}`,
    airline: 'Hotellook',
    airlineCode: 'HOTEL',
    origin: 'ZIVO',
    destination: params.destination,
    price: 0,
    passengers: params.guests,
    cabinClass: 'standard',
    affiliatePartner: 'hotellook',
    referralUrl: url,
    source: options.source,
    ctaType: options.ctaType,
    serviceType: 'hotels',
  });
  
  // Open in-app browser on native, new tab on web
  import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  
  return url;
}

/**
 * Redirect to car rental partner with deep link parameters
 */
export function redirectToCarPartner(
  params: CarDeepLinkParams,
  options: RedirectOptions
) {
  const url = buildCarDeepLink(params);
  
  // Track the click
  trackAffiliateClick({
    flightId: `car-${params.pickupLocation}-${Date.now()}`,
    airline: 'EconomyBookings',
    airlineCode: 'CAR',
    origin: params.pickupLocation,
    destination: params.pickupLocation,
    price: 0,
    passengers: 1,
    cabinClass: 'standard',
    affiliatePartner: 'economybookings',
    referralUrl: url,
    source: options.source,
    ctaType: options.ctaType,
    serviceType: 'car_rental',
  });
  
  // Open in-app browser on native, new tab on web
  import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  
  return url;
}

/**
 * Redirect to activity partner with deep link parameters
 */
export function redirectToActivityPartner(
  params: ActivityDeepLinkParams,
  options: RedirectOptions
) {
  const url = buildActivityDeepLink(params);
  
  // Track the click
  trackAffiliateClick({
    flightId: `activity-${params.destination}-${Date.now()}`,
    airline: 'Tiqets',
    airlineCode: 'ACT',
    origin: 'ZIVO',
    destination: params.destination,
    price: 0,
    passengers: 1,
    cabinClass: 'standard',
    affiliatePartner: 'tiqets',
    referralUrl: url,
    source: options.source,
    ctaType: options.ctaType,
    serviceType: 'activities',
  });
  
  // Open in-app browser on native, new tab on web
  import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  
  return url;
}

/**
 * Simple redirect to affiliate partner (no deep link)
 */
export function redirectToPartner(
  serviceType: 'flights' | 'hotels' | 'cars' | 'activities',
  options: RedirectOptions
) {
  const link = AFFILIATE_LINKS[serviceType];
  if (!link) {
    console.warn(`[Affiliate] Unknown service type: ${serviceType}`);
    return;
  }
  
  // Track the click
  trackAffiliateClick({
    flightId: `${serviceType}-general-${Date.now()}`,
    airline: link.name,
    airlineCode: serviceType.toUpperCase(),
    origin: 'ZIVO',
    destination: 'Partner',
    price: 0,
    passengers: 1,
    cabinClass: 'standard',
    affiliatePartner: link.name.toLowerCase(),
    referralUrl: link.url,
    source: options.source,
    ctaType: options.ctaType,
    serviceType: serviceType === 'cars' ? 'car_rental' : serviceType,
  });
  
  // Open in-app browser on native, new tab on web
  import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(link.url));
  
  return link.url;
}

// ============================================
// ANALYTICS HELPERS
// ============================================

/**
 * Get click analytics for dashboard
 */
export function getClickAnalytics() {
  const clicks = JSON.parse(localStorage.getItem('affiliate_clicks') || '[]');
  
  const byService = clicks.reduce((acc: Record<string, number>, c: any) => {
    const service = c.serviceType || 'unknown';
    acc[service] = (acc[service] || 0) + 1;
    return acc;
  }, {});
  
  const byCTA = clicks.reduce((acc: Record<string, number>, c: any) => {
    const cta = c.ctaType || 'unknown';
    acc[cta] = (acc[cta] || 0) + 1;
    return acc;
  }, {});
  
  const byPartner = clicks.reduce((acc: Record<string, number>, c: any) => {
    const partner = c.affiliatePartner || 'unknown';
    acc[partner] = (acc[partner] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total: clicks.length,
    byService,
    byCTA,
    byPartner,
    recentClicks: clicks.slice(-20).reverse(),
  };
}
