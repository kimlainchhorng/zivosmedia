/**
 * ZIVO Multi-Partner Affiliate System
 * 
 * PRODUCTION-READY AFFILIATE INFRASTRUCTURE
 * Supports multiple affiliate networks with dynamic deep links
 * 
 * Primary Networks:
 * - Travelpayouts (Flights, Hotels, Cars, Activities, Transfers, eSIM, etc.)
 * 
 * IMPORTANT: Do not modify SubIDs without Business Operations approval.
 * 
 * Last Updated: 2026-01-31
 */

// ============================================
// CORE TYPES
// ============================================

export interface AffiliatePartner {
  id: string;
  name: string;
  network: 'travelpayouts' | 'direct' | 'cj' | 'awin' | 'skyscanner' | 'other';
  baseUrl: string;
  trackingUrl: string;
  subId: string;
  commissionRate: string;
  features: string[];
  logo: string;
  isActive: boolean;
  priority: number;
  supportedRegions?: string[];
}

export interface FlightDeepLinkParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
  tripType: 'roundtrip' | 'oneway' | 'multicity';
  currency?: string;
  locale?: string;
}

export interface HotelDeepLinkParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  currency?: string;
  locale?: string;
}

export interface CarDeepLinkParams {
  pickupLocation: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  driverAge?: number;
  vehicleType?: 'economy' | 'compact' | 'midsize' | 'suv' | 'luxury' | 'van';
  currency?: string;
}

export interface ActivityDeepLinkParams {
  destination: string;
  date?: string;
  category?: string;
  currency?: string;
}

// ============================================
// TRAVELPAYOUTS DIRECT LINKS (NEW)
// ============================================



export const TRAVELPAYOUTS_DIRECT_LINKS = {
  // FLIGHTS
  flights: {
    primary: 'https://searadar.tpo.li/iAbLlX9i',
    backup: 'https://aviasales.tpo.li/aayXqoez',
    subId: 'zivo_flights',
  },
  
  // HOTELS (Hotellook + Hotels.tpo.li)
  hotels: {
    primary: 'https://hotellook.tpo.li',
    hotelsTpo: 'https://hotels.tpo.li/mszBRRYU',
    subId: 'zivo_hotels',
  },
  
  // CAR RENTAL
  cars: {
    economybookings: 'https://economybookings.tpo.li/J668L2lY',
    qeeq: 'https://qeeq.tpo.li/GsmrS6zJ',
    getrentacar: 'https://getrentacar.tpo.li/P20v54bz',
    subId: 'zivo_cars',
  },
  
  // AIRPORT TRANSFERS
  transfers: {
    kiwitaxi: 'https://kiwitaxi.tpo.li/Bj6zghJH',
    gettransfer: 'https://gettransfer.tpo.li/FbrIguyh',
    intui: 'https://intui.tpo.li/CgNTdSyh',
    subId: 'zivo_transfers',
  },
  
  // ACTIVITIES / THINGS TO DO
  activities: {
    tiqets: 'https://tiqets.tpo.li/5fqrcQWZ',
    wegotrip: 'https://wegotrip.tpo.li/QSrOpIdV',
    ticketnetwork: 'https://ticketnetwork.tpo.li/utk3u8Vr',
    subId: 'zivo_activities',
  },
  
  // TRAVEL eSIM / INTERNET
  esim: {
    airalo: 'https://airalo.tpo.li/zVRtp8Zt',
    drimsim: 'https://drimsim.tpo.li/A9yKO5oA',
    yesim: 'https://yesim.tpo.li/OpjeHJgH',
    subId: 'zivo_esim',
  },
  
  // LUGGAGE STORAGE
  luggage: {
    radicalstorage: 'https://radicalstorage.tpo.li/4W0KR99h',
    subId: 'zivo_luggage',
  },
  
  // FLIGHT COMPENSATION
  compensation: {
    airhelp: 'https://airhelp.tpo.li/7Z5saPi2',
    compensair: 'https://compensair.tpo.li/npsp8pm0',
    subId: 'zivo_compensation',
  },
  
  // GENERAL FALLBACK
  general: {
    fallback: 'https://tpo.li/1hIVtHlP',
    subId: 'zivo_general',
  },
} as const;

// ============================================
// PARTNER REGISTRIES BY SERVICE
// ============================================

export const FLIGHT_PARTNERS: AffiliatePartner[] = [
  {
    id: 'searadar',
    name: 'Searadar',
    network: 'travelpayouts',
    baseUrl: 'https://www.aviasales.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.flights.primary,
    subId: 'zivo_flights',
    commissionRate: '0.5-3%',
    features: ['728 airlines', 'Real-time prices', 'Multi-city search', 'Price calendar'],
    logo: 'FL',
    isActive: true,
    priority: 100,
  },
  {
    id: 'aviasales',
    name: 'Aviasales',
    network: 'travelpayouts',
    baseUrl: 'https://www.aviasales.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.flights.backup,
    subId: 'zivo_flights_backup',
    commissionRate: '0.5-3%',
    features: ['728 airlines', 'Backup provider'],
    logo: 'FL',
    isActive: true,
    priority: 90,
  },
];

export const CAR_PARTNERS: AffiliatePartner[] = [
  {
    id: 'economybookings',
    name: 'EconomyBookings',
    network: 'travelpayouts',
    baseUrl: 'https://www.economybookings.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings,
    subId: 'zivo_cars',
    commissionRate: '4-6%',
    features: ['500+ providers', 'No hidden fees', 'Free cancellation', 'Best price guarantee'],
    logo: 'CR',
    isActive: true,
    priority: 100,
  },
  {
    id: 'qeeq',
    name: 'QEEQ',
    network: 'travelpayouts',
    baseUrl: 'https://www.qeeq.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq,
    subId: 'zivo_cars_qeeq',
    commissionRate: '4-8%',
    features: ['Price match', 'Full insurance options', '24/7 support'],
    logo: 'QQ',
    isActive: true,
    priority: 90,
  },
  {
    id: 'getrentacar',
    name: 'GetRentACar',
    network: 'travelpayouts',
    baseUrl: 'https://www.getrentacar.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.getrentacar,
    subId: 'zivo_cars_grac',
    commissionRate: '4-6%',
    features: ['Local providers', 'Budget-friendly', 'Easy booking'],
    logo: 'GR',
    isActive: true,
    priority: 80,
  },
];

export const TRANSFER_PARTNERS: AffiliatePartner[] = [
  {
    id: 'kiwitaxi',
    name: 'KiwiTaxi',
    network: 'travelpayouts',
    baseUrl: 'https://www.kiwitaxi.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.transfers.kiwitaxi,
    subId: 'zivo_transfers',
    commissionRate: '5-10%',
    features: ['Airport transfers', 'Private cars', 'Fixed prices', '24/7 support'],
    logo: 'KT',
    isActive: true,
    priority: 100,
  },
  {
    id: 'gettransfer',
    name: 'GetTransfer',
    network: 'travelpayouts',
    baseUrl: 'https://www.gettransfer.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.transfers.gettransfer,
    subId: 'zivo_transfers_gt',
    commissionRate: '5-8%',
    features: ['Compare drivers', 'Best prices', 'Safe & reliable'],
    logo: 'GT',
    isActive: true,
    priority: 90,
  },
  {
    id: 'intui',
    name: 'Intui.travel',
    network: 'travelpayouts',
    baseUrl: 'https://www.intui.travel',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.transfers.intui,
    subId: 'zivo_transfers_intui',
    commissionRate: '5-8%',
    features: ['Group transfers', 'Shuttle services', 'Budget option'],
    logo: 'IT',
    isActive: true,
    priority: 80,
  },
];

export const ACTIVITY_PARTNERS: AffiliatePartner[] = [
  {
    id: 'tiqets',
    name: 'Tiqets',
    network: 'travelpayouts',
    baseUrl: 'https://www.tiqets.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.activities.tiqets,
    subId: 'zivo_activities',
    commissionRate: '5-8%',
    features: ['Skip-the-line tickets', 'Museums & attractions', 'Instant confirmation', 'Mobile vouchers'],
    logo: 'TQ',
    isActive: true,
    priority: 95,
  },
  {
    id: 'wegotrip',
    name: 'WeGoTrip',
    network: 'travelpayouts',
    baseUrl: 'https://www.wegotrip.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.activities.wegotrip,
    subId: 'zivo_activities_wgt',
    commissionRate: '5-8%',
    features: ['Audio guides', 'Self-guided tours', 'Unique experiences'],
    logo: 'WG',
    isActive: true,
    priority: 90,
  },
  {
    id: 'ticketnetwork',
    name: 'TicketNetwork',
    network: 'travelpayouts',
    baseUrl: 'https://www.ticketnetwork.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.activities.ticketnetwork,
    subId: 'zivo_activities_tn',
    commissionRate: '3-6%',
    features: ['Concerts', 'Sports events', 'Theater tickets', 'Live entertainment'],
    logo: 'TN',
    isActive: true,
    priority: 80,
  },
];

export const ESIM_PARTNERS: AffiliatePartner[] = [
  {
    id: 'airalo',
    name: 'Airalo',
    network: 'travelpayouts',
    baseUrl: 'https://www.airalo.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.esim.airalo,
    subId: 'zivo_esim',
    commissionRate: '10-15%',
    features: ['190+ countries', 'Instant eSIM', 'No roaming fees', 'Easy setup'],
    logo: 'AR',
    isActive: true,
    priority: 100,
  },
  {
    id: 'drimsim',
    name: 'Drimsim',
    network: 'travelpayouts',
    baseUrl: 'https://www.drimsim.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.esim.drimsim,
    subId: 'zivo_esim_drim',
    commissionRate: '8-12%',
    features: ['Global SIM card', 'Pay as you go', 'Data packages'],
    logo: 'DR',
    isActive: true,
    priority: 90,
  },
  {
    id: 'yesim',
    name: 'Yesim',
    network: 'travelpayouts',
    baseUrl: 'https://www.yesim.app',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.esim.yesim,
    subId: 'zivo_esim_yesim',
    commissionRate: '8-12%',
    features: ['Budget eSIM', 'Regional plans', 'Top-up anytime'],
    logo: 'YS',
    isActive: true,
    priority: 80,
  },
];

export const LUGGAGE_PARTNERS: AffiliatePartner[] = [
  {
    id: 'radicalstorage',
    name: 'Radical Storage',
    network: 'travelpayouts',
    baseUrl: 'https://www.radicalstorage.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.luggage.radicalstorage,
    subId: 'zivo_luggage',
    commissionRate: '10-15%',
    features: ['$5.90/day flat rate', '100+ cities', 'Secure locations', 'Insurance included'],
    logo: 'RS',
    isActive: true,
    priority: 100,
  },
];

export const COMPENSATION_PARTNERS: AffiliatePartner[] = [
  {
    id: 'airhelp',
    name: 'AirHelp',
    network: 'travelpayouts',
    baseUrl: 'https://www.airhelp.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.compensation.airhelp,
    subId: 'zivo_compensation',
    commissionRate: '15-25%',
    features: ['Up to €600 compensation', 'No win no fee', 'Flight delay claims', '98% success rate'],
    logo: 'AH',
    isActive: true,
    priority: 100,
  },
  {
    id: 'compensair',
    name: 'Compensair',
    network: 'travelpayouts',
    baseUrl: 'https://www.compensair.com',
    trackingUrl: TRAVELPAYOUTS_DIRECT_LINKS.compensation.compensair,
    subId: 'zivo_compensation_ca',
    commissionRate: '15-20%',
    features: ['Free claim check', 'Up to €600', 'Quick processing', 'No paperwork'],
    logo: 'CO',
    isActive: true,
    priority: 90,
  },
];

export const HOTEL_PARTNERS: AffiliatePartner[] = [
  {
    id: 'hotellook',
    name: 'Hotellook',
    network: 'travelpayouts',
    baseUrl: 'https://www.hotellook.com',
    trackingUrl: 'https://hotellook.tpo.li',
    subId: 'zivo_hotels',
    commissionRate: '4-8%',
    features: ['2M+ hotels', 'Price comparison', 'No booking fees', 'Free cancellation'],
    logo: 'HL',
    isActive: true,
    priority: 100,
  },
];

// ============================================
// SIMPLE AFFILIATE LINKS (Quick Access)
// ============================================

export interface AffiliateLink {
  url: string;
  name: string;
  description: string;
  subId: string;
  fallbackUrl?: string;
}

export const AFFILIATE_LINKS: Record<string, AffiliateLink> = {
  flights: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.flights.primary,
    name: "Searadar",
    description: "Search and compare flight prices from 728 airlines",
    subId: 'zivo_flights',
    fallbackUrl: TRAVELPAYOUTS_DIRECT_LINKS.flights.backup,
  },
  hotels: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.hotels.primary,
    name: "Hotellook",
    description: "Compare hotel prices across booking sites",
    subId: 'zivo_hotels',
    fallbackUrl: "https://www.hotellook.com",
  },
  cars: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings,
    name: "EconomyBookings",
    description: "Compare car rental prices from 500+ providers",
    subId: 'zivo_cars',
    fallbackUrl: TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq,
  },
  activities: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.activities.tiqets,
    name: "Tiqets",
    description: "Book tours, attractions, and experiences worldwide",
    subId: 'zivo_activities',
    fallbackUrl: TRAVELPAYOUTS_DIRECT_LINKS.activities.wegotrip,
  },
  transfers: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.transfers.kiwitaxi,
    name: "KiwiTaxi",
    description: "Book airport transfers and private rides",
    subId: 'zivo_transfers',
    fallbackUrl: TRAVELPAYOUTS_DIRECT_LINKS.transfers.gettransfer,
  },
  esim: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.esim.airalo,
    name: "Airalo",
    description: "Get travel eSIM for 190+ countries",
    subId: 'zivo_esim',
    fallbackUrl: TRAVELPAYOUTS_DIRECT_LINKS.esim.drimsim,
  },
  luggage: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.luggage.radicalstorage,
    name: "Radical Storage",
    description: "Store your bags securely while you explore",
    subId: 'zivo_luggage',
  },
  compensation: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.compensation.airhelp,
    name: "AirHelp",
    description: "Get up to €600 for delayed or cancelled flights",
    subId: 'zivo_compensation',
    fallbackUrl: TRAVELPAYOUTS_DIRECT_LINKS.compensation.compensair,
  },
  general: {
    url: TRAVELPAYOUTS_DIRECT_LINKS.general.fallback,
    name: "Travelpayouts",
    description: "Explore all travel options",
    subId: 'zivo_general',
  },
} as const;

// ============================================
// DEEP LINK BUILDERS (with standardized Hizovo tracking)
// ============================================

import { 
  getSearchSessionId, 
  HIZOVO_TRACKING_PARAMS,
  buildTrackedUrl,
} from './trackingParams';

/**
 * Build standardized tracking query string
 * utm_source=hizovo&utm_medium=affiliate&utm_campaign=travel&subid={searchSessionId}
 */
function getStandardTrackingParams(): string {
  const sessionId = getSearchSessionId();
  return `utm_source=${HIZOVO_TRACKING_PARAMS.utm_source}&utm_medium=${HIZOVO_TRACKING_PARAMS.utm_medium}&utm_campaign=${HIZOVO_TRACKING_PARAMS.utm_campaign}&subid=${sessionId}`;
}

export function buildFlightDeepLink(params: FlightDeepLinkParams, partnerId?: string): string {
  const partner = partnerId 
    ? FLIGHT_PARTNERS.find(p => p.id === partnerId && p.isActive)
    : getActivePartners('flights')[0];
  
  if (!partner) {
    return buildTrackedUrl({ baseUrl: AFFILIATE_LINKS.flights.url });
  }
  
  // Add standardized tracking to partner URL
  return buildTrackedUrl({ baseUrl: partner.trackingUrl });
}

export function buildHotelDeepLink(params: HotelDeepLinkParams, partnerId?: string): string {
  const partner = partnerId 
    ? HOTEL_PARTNERS.find(p => p.id === partnerId && p.isActive)
    : getActivePartners('hotels')[0];
  
  if (!partner) {
    return buildTrackedUrl({ baseUrl: AFFILIATE_LINKS.hotels.url });
  }
  
  return buildTrackedUrl({ baseUrl: partner.trackingUrl });
}

export function buildCarDeepLink(params: CarDeepLinkParams, partnerId?: string): string {
  const partner = partnerId 
    ? CAR_PARTNERS.find(p => p.id === partnerId && p.isActive)
    : getActivePartners('cars')[0];
  
  if (!partner) {
    return buildTrackedUrl({ baseUrl: AFFILIATE_LINKS.cars.url });
  }
  
  return buildTrackedUrl({ baseUrl: partner.trackingUrl });
}

export function buildActivityDeepLink(params: ActivityDeepLinkParams, partnerId?: string): string {
  const partner = partnerId 
    ? ACTIVITY_PARTNERS.find(p => p.id === partnerId && p.isActive)
    : getActivePartners('activities')[0];
  
  if (!partner) {
    return buildTrackedUrl({ baseUrl: AFFILIATE_LINKS.activities.url });
  }
  
  return buildTrackedUrl({ baseUrl: partner.trackingUrl });
}

// ============================================
// PARTNER HELPER FUNCTIONS
// ============================================

type ServiceType = 'flights' | 'hotels' | 'cars' | 'activities' | 'transfers' | 'esim' | 'luggage' | 'compensation';

export function getActivePartners(serviceType: ServiceType): AffiliatePartner[] {
  const partnerMap: Record<ServiceType, AffiliatePartner[]> = {
    flights: FLIGHT_PARTNERS,
    hotels: HOTEL_PARTNERS,
    cars: CAR_PARTNERS,
    activities: ACTIVITY_PARTNERS,
    transfers: TRANSFER_PARTNERS,
    esim: ESIM_PARTNERS,
    luggage: LUGGAGE_PARTNERS,
    compensation: COMPENSATION_PARTNERS,
  };
  
  return partnerMap[serviceType]
    .filter(p => p.isActive)
    .sort((a, b) => b.priority - a.priority);
}

export function getPrimaryPartner(serviceType: ServiceType): AffiliatePartner | null {
  const active = getActivePartners(serviceType);
  return active[0] || null;
}

export function getPartnerById(serviceType: ServiceType, partnerId: string): AffiliatePartner | null {
  const partnerMap: Record<ServiceType, AffiliatePartner[]> = {
    flights: FLIGHT_PARTNERS,
    hotels: HOTEL_PARTNERS,
    cars: CAR_PARTNERS,
    activities: ACTIVITY_PARTNERS,
    transfers: TRANSFER_PARTNERS,
    esim: ESIM_PARTNERS,
    luggage: LUGGAGE_PARTNERS,
    compensation: COMPENSATION_PARTNERS,
  };
  
  return partnerMap[serviceType].find(p => p.id === partnerId) || null;
}

export function selectBestPartner(
  serviceType: ServiceType, 
  _context?: { region?: string; testGroup?: string }
): AffiliatePartner | null {
  return getPrimaryPartner(serviceType);
}

// ============================================
// COMPLIANCE TEXT
// ============================================

export const AFFILIATE_DISCLOSURE_TEXT = {
  short: "You will be redirected to our trusted travel partner to complete your booking.",
  full: "Hizovo may earn a commission when you book through our partner links at no extra cost to you.",
  detailed: "Hizovo acts as a search and comparison platform. When you click a booking link, you will be redirected to our trusted travel partner to complete your booking. Hizovo may earn a commission at no additional cost to you.",
  payment: "All bookings, payments, refunds, and changes are handled directly by our travel partners.",
  price: "Prices shown are indicative and may change. Final price will be confirmed on partner site.",
  legal: "Hizovo is not responsible for the content, accuracy, or practices of partner websites.",
  hizovo: "Hizovo is not the merchant of record. Travel bookings are fulfilled by licensed third-party providers.",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function openAffiliateLink(type: keyof typeof AFFILIATE_LINKS): Promise<void> {
  const link = AFFILIATE_LINKS[type];
  if (!link) return;
  
  const { openExternalUrl } = await import("@/lib/openExternalUrl");
  try {
    await openExternalUrl(link.url);
  } catch {
    if (link.fallbackUrl) {
      await openExternalUrl(link.fallbackUrl);
    }
  }
}

export function getAffiliateUrl(type: keyof typeof AFFILIATE_LINKS): string {
  const link = AFFILIATE_LINKS[type];
  return link?.url || link?.fallbackUrl || "#";
}

export function getAffiliateLinkHealth(): Record<string, boolean> {
  const health: Record<string, boolean> = {};
  for (const [key, link] of Object.entries(AFFILIATE_LINKS)) {
    health[key] = !!link.url && link.url !== '#';
  }
  return health;
}

/**
 * Open a partner link through the /out tracking route
 * This ensures all clicks are logged with SubID tracking
 */
export async function openPartnerLink(
  url: string, 
  options?: { 
    partnerId?: string; 
    partnerName?: string; 
    product?: string; 
    pageSource?: string;
  }
): Promise<void> {
  const { partnerId = 'partner', partnerName = 'Partner', product = 'general', pageSource = 'unknown' } = options || {};
  
  const params = new URLSearchParams({
    partner: partnerId,
    name: partnerName,
    product,
    page: pageSource,
    url: url,
  });
  
  const outboundUrl = `/out?${params.toString()}`;
  const { openExternalUrl } = await import("@/lib/openExternalUrl");
  await openExternalUrl(outboundUrl);
}

/**
 * Legacy function for direct partner link opening (bypasses tracking)
 * Use openPartnerLink for tracked links
 */
export async function openPartnerLinkDirect(url: string): Promise<void> {
  const { openExternalUrl } = await import("@/lib/openExternalUrl");
  await openExternalUrl(url);
}
