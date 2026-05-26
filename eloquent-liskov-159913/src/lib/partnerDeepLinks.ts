/**
 * Partner Deep Link Utilities
 * 
 * Builds affiliate deep links with proper tracking parameters
 * for Hotels and Car Rental partners
 * 
 * STANDARDIZED TRACKING:
 * - utm_source=hizovo
 * - utm_medium=affiliate
 * - utm_campaign=travel
 * - subid={searchSessionId}
 */

import { HIZOVO_TRACKING_PARAMS, getSearchSessionId } from "@/config/trackingParams";
import { TRAVELPAYOUTS_DIRECT_LINKS, HOTEL_PARTNERS, CAR_PARTNERS } from "@/config/affiliateLinks";

// ============================================
// HOTEL PARTNER DEEP LINKS
// ============================================

export interface HotelDeepLinkParams {
  destination: string;       // City name or slug
  checkIn: string;           // YYYY-MM-DD
  checkOut: string;          // YYYY-MM-DD
  adults: number;
  rooms: number;
  children?: number;
  hotelId?: string;          // Specific hotel ID if available
  hotelName?: string;        // For tracking
}

/**
 * Build Booking.com affiliate URL with tracking
 */
export function buildBookingDeepLink(params: HotelDeepLinkParams): string {
  const sessionId = getSearchSessionId();
  
  const urlParams = new URLSearchParams({
    ss: params.destination,
    checkin: params.checkIn,
    checkout: params.checkOut,
    group_adults: String(params.adults),
    no_rooms: String(params.rooms),
    // Tracking params
    aid: '618730', // Travelpayouts affiliate ID
    label: `${HIZOVO_TRACKING_PARAMS.utm_source}_${HIZOVO_TRACKING_PARAMS.utm_campaign}`,
  });
  
  if (params.children) {
    urlParams.set('group_children', String(params.children));
  }
  
  return `https://www.booking.com/searchresults.html?${urlParams.toString()}`;
}

/**
 * Build Hotels.com affiliate URL with tracking
 */
export function buildHotelsComDeepLink(params: HotelDeepLinkParams): string {
  const urlParams = new URLSearchParams({
    'q-destination': params.destination,
    'q-check-in': params.checkIn,
    'q-check-out': params.checkOut,
    'q-room-0-adults': String(params.adults),
    'q-rooms': String(params.rooms),
  });
  
  return `https://www.hotels.com/search.do?${urlParams.toString()}`;
}

/**
 * Build Expedia affiliate URL with tracking
 */
export function buildExpediaDeepLink(params: HotelDeepLinkParams): string {
  const urlParams = new URLSearchParams({
    destination: params.destination,
    startDate: params.checkIn,
    endDate: params.checkOut,
    adults: String(params.adults),
    rooms: String(params.rooms),
  });
  
  return `https://www.expedia.com/Hotel-Search?${urlParams.toString()}`;
}

/**
 * Build Hotellook/Travelpayouts affiliate URL
 */
export function buildHotellookDeepLink(params: HotelDeepLinkParams): string {
  // Hotellook uses Travelpayouts tracking links
  return TRAVELPAYOUTS_DIRECT_LINKS.hotels.primary;
}

/**
 * Get primary hotel partner URL with tracking
 */
export function getPrimaryHotelPartnerUrl(params: HotelDeepLinkParams): {
  url: string;
  partnerId: string;
  partnerName: string;
} {
  const activePartner = HOTEL_PARTNERS.find(p => p.isActive) || HOTEL_PARTNERS[0];
  
  let url: string;
  switch (activePartner.id) {
    case 'booking':
      url = buildBookingDeepLink(params);
      break;
    case 'hotelscom':
      url = buildHotelsComDeepLink(params);
      break;
    case 'expedia':
      url = buildExpediaDeepLink(params);
      break;
    default:
      url = buildBookingDeepLink(params);
  }
  
  return {
    url,
    partnerId: activePartner.id,
    partnerName: activePartner.name,
  };
}

// ============================================
// CAR RENTAL PARTNER DEEP LINKS
// ============================================

export interface CarDeepLinkParams {
  pickupLocation: string;    // City name or IATA code
  pickupDate: string;        // YYYY-MM-DD
  pickupTime: string;        // HH:mm
  dropoffDate: string;       // YYYY-MM-DD
  dropoffTime: string;       // HH:mm
  driverAge?: number;
  vehicleType?: string;      // For tracking
}

/**
 * Build EconomyBookings affiliate URL
 */
export function buildEconomyBookingsDeepLink(params: CarDeepLinkParams): string {
  // EconomyBookings uses Travelpayouts tracking links
  return TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings;
}

/**
 * Build QEEQ affiliate URL
 */
export function buildQeeqDeepLink(params: CarDeepLinkParams): string {
  return TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq;
}

/**
 * Build GetRentACar affiliate URL
 */
export function buildGetRentACarDeepLink(params: CarDeepLinkParams): string {
  return TRAVELPAYOUTS_DIRECT_LINKS.cars.getrentacar;
}

/**
 * Build Priceline car rental URL
 */
export function buildPricelineCarDeepLink(params: CarDeepLinkParams): string {
  const urlParams = new URLSearchParams({
    pickup_location: params.pickupLocation,
    pickup_date: params.pickupDate,
    pickup_time: params.pickupTime,
    dropoff_date: params.dropoffDate,
    dropoff_time: params.dropoffTime,
  });
  
  if (params.driverAge) {
    urlParams.set('driver_age', String(params.driverAge));
  }
  
  return `https://www.priceline.com/cars/?${urlParams.toString()}`;
}

/**
 * Get primary car partner URL with tracking
 */
export function getPrimaryCarPartnerUrl(params: CarDeepLinkParams): {
  url: string;
  partnerId: string;
  partnerName: string;
} {
  const activePartner = CAR_PARTNERS.find(p => p.isActive) || CAR_PARTNERS[0];
  
  let url: string;
  switch (activePartner.id) {
    case 'economybookings':
      url = buildEconomyBookingsDeepLink(params);
      break;
    case 'qeeq':
      url = buildQeeqDeepLink(params);
      break;
    case 'getrentacar':
      url = buildGetRentACarDeepLink(params);
      break;
    default:
      url = buildEconomyBookingsDeepLink(params);
  }
  
  return {
    url,
    partnerId: activePartner.id,
    partnerName: activePartner.name,
  };
}

/**
 * Get all active car partners with URLs
 */
export function getAllCarPartnerUrls(params: CarDeepLinkParams): Array<{
  url: string;
  partnerId: string;
  partnerName: string;
  priority: number;
}> {
  return CAR_PARTNERS
    .filter(p => p.isActive)
    .sort((a, b) => b.priority - a.priority)
    .map(partner => ({
      url: partner.trackingUrl,
      partnerId: partner.id,
      partnerName: partner.name,
      priority: partner.priority,
    }));
}

// ============================================
// GENERIC UTILITIES
// ============================================

/**
 * Append Hizovo tracking params to any URL
 */
export function appendTrackingParams(baseUrl: string): string {
  const sessionId = getSearchSessionId();
  const url = new URL(baseUrl);
  
  url.searchParams.set('utm_source', HIZOVO_TRACKING_PARAMS.utm_source);
  url.searchParams.set('utm_medium', HIZOVO_TRACKING_PARAMS.utm_medium);
  url.searchParams.set('utm_campaign', HIZOVO_TRACKING_PARAMS.utm_campaign);
  url.searchParams.set('subid', sessionId);
  
  return url.toString();
}

/**
 * Build /out redirect URL with all params
 */
export function buildOutRedirectUrl(
  partnerId: string,
  partnerName: string,
  product: "flights" | "hotels" | "cars",
  pageSource: string,
  destinationUrl: string,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams({
    partner: partnerId,
    name: partnerName,
    product,
    page: pageSource,
    url: destinationUrl,
    ...extraParams,
  });
  
  return `/out?${params.toString()}`;
}
