// Affiliate partner configuration for flight booking redirects
export interface AffiliatePartner {
  id: string;
  name: string;
  logo: string;
  baseUrl: string;
  urlTemplate: (params: AffiliateUrlParams) => string;
  priority: number; // Higher = preferred
  commissionRate: string;
  features: string[];
  color: string;
}

export interface AffiliateUrlParams {
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
}

export const affiliatePartners: AffiliatePartner[] = [
  {
    id: 'skyscanner',
    name: 'Skyscanner',
    logo: 'search',
    baseUrl: 'https://www.skyscanner.com',
    urlTemplate: ({ origin, destination, departDate, returnDate }) => {
      const base = `https://www.skyscanner.com/transport/flights/${origin}/${destination}`;
      const datePart = departDate ? `/${departDate}` : '';
      const returnPart = returnDate ? `/${returnDate}` : '';
      return `${base}${datePart}${returnPart}/`;
    },
    priority: 100,
    commissionRate: 'Competitive',
    features: ['Real-time prices', 'Price alerts', 'Multi-city'],
    color: 'bg-sky-500'
  },
  {
    id: 'kayak',
    name: 'Kayak',
    logo: 'plane-takeoff',
    baseUrl: 'https://www.kayak.com',
    urlTemplate: ({ origin, destination, departDate, returnDate, cabinClass }) => {
      const cabin = cabinClass === 'business' ? 'b' : cabinClass === 'first' ? 'f' : 'e';
      const base = `https://www.kayak.com/flights/${origin}-${destination}`;
      const datePart = departDate ? `/${departDate}` : '';
      const returnPart = returnDate ? `/${returnDate}` : '';
      return `${base}${datePart}${returnPart}?sort=bestflight_a&fs=cabin=${cabin}`;
    },
    priority: 90,
    commissionRate: 'Competitive',
    features: ['Fare predictor', 'Explore map', 'Price freeze'],
    color: 'bg-orange-500'
  },
  {
    id: 'momondo',
    name: 'Momondo',
    logo: 'plane',
    baseUrl: 'https://www.momondo.com',
    urlTemplate: ({ origin, destination, departDate }) => {
      const base = `https://www.momondo.com/flight-search/${origin}-${destination}`;
      const datePart = departDate ? `/${departDate}` : '';
      return `${base}${datePart}`;
    },
    priority: 80,
    commissionRate: 'Competitive',
    features: ['Price insights', 'Best time to fly', 'Trip finder'],
    color: 'bg-purple-500'
  },
  {
    id: 'trip',
    name: 'Trip.com',
    logo: 'globe',
    baseUrl: 'https://www.trip.com',
    urlTemplate: ({ origin, destination, departDate }) => {
      return `https://www.trip.com/flights/${origin}-${destination}?departdate=${departDate || ''}`;
    },
    priority: 70,
    commissionRate: 'Competitive',
    features: ['Bundle deals', 'Loyalty points', '24/7 support'],
    color: 'bg-blue-600'
  },
  {
    id: 'cheapflights',
    name: 'Cheapflights',
    logo: 'dollar-sign',
    baseUrl: 'https://www.cheapflights.com',
    urlTemplate: ({ origin, destination, departDate, returnDate }) => {
      const base = `https://www.cheapflights.com/flight-search/${origin}-${destination}`;
      const datePart = departDate ? `/${departDate}` : '';
      const returnPart = returnDate ? `/${returnDate}` : '';
      return `${base}${datePart}${returnPart}`;
    },
    priority: 65,
    commissionRate: 'Competitive',
    features: ['Budget deals', 'Flexible dates', 'Price drops'],
    color: 'bg-emerald-500'
  },
  {
    id: 'google_flights',
    name: 'Google Flights',
    logo: 'search',
    baseUrl: 'https://www.google.com/flights',
    urlTemplate: ({ origin, destination, departDate, returnDate }) => {
      return `https://www.google.com/travel/flights?q=Flights%20from%20${origin}%20to%20${destination}%20on%20${departDate || 'flexible'}${returnDate ? `%20returning%20${returnDate}` : ''}`;
    },
    priority: 60,
    commissionRate: 'Free',
    features: ['Tracked prices', 'Explore anywhere', 'Date grid'],
    color: 'bg-blue-500'
  },
];

// Get affiliate URL for a flight
export function getAffiliateUrl(
  partnerId: string,
  params: AffiliateUrlParams
): string {
  const partner = affiliatePartners.find(p => p.id === partnerId);
  if (!partner) {
    // Default to Skyscanner
    return affiliatePartners[0].urlTemplate(params);
  }
  return partner.urlTemplate(params);
}

// Get top partners for display
export function getTopPartners(limit: number = 4): AffiliatePartner[] {
  return affiliatePartners
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

// Cross-sell affiliate links for hotels, cars, insurance
export interface CrossSellPartner {
  id: string;
  name: string;
  type: 'hotel' | 'car' | 'insurance';
  logo: string;
  urlTemplate: (destination: string, dates?: { checkIn?: string; checkOut?: string }) => string;
  tagline: string;
  color: string;
}

export const crossSellPartners: CrossSellPartner[] = [
  // Hotels
  {
    id: 'booking',
    name: 'Booking.com',
    type: 'hotel',
    logo: 'building-2',
    urlTemplate: (destination, dates) => 
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}${dates?.checkIn ? `&checkin=${dates.checkIn}` : ''}${dates?.checkOut ? `&checkout=${dates.checkOut}` : ''}`,
    tagline: 'Save on hotels at your destination',
    color: 'bg-blue-600'
  },
  {
    id: 'hotels',
    name: 'Hotels.com',
    type: 'hotel',
    logo: 'bed-double',
    urlTemplate: (destination) => 
      `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(destination)}`,
    tagline: 'Collect 10 nights, get 1 free',
    color: 'bg-red-500'
  },
  {
    id: 'expedia',
    name: 'Expedia',
    type: 'hotel',
    logo: 'globe',
    urlTemplate: (destination) => 
      `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destination)}`,
    tagline: 'Bundle & save with flight+hotel',
    color: 'bg-yellow-500'
  },
  // Car Rentals
  {
    id: 'rentalcars',
    name: 'Rentalcars.com',
    type: 'car',
    logo: 'car',
    urlTemplate: (destination) => 
      `https://www.rentalcars.com/SearchResults.do?searchType=destination&searchQuery=${encodeURIComponent(destination)}`,
    tagline: 'Compare car rental deals',
    color: 'bg-orange-500'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    type: 'car',
    logo: 'car-front',
    urlTemplate: (destination) => 
      `https://www.enterprise.com/en/car-rental/locations/search.html?location=${encodeURIComponent(destination)}`,
    tagline: 'Pick up at the airport',
    color: 'bg-green-600'
  },
  // Insurance
  {
    id: 'worldnomads',
    name: 'World Nomads',
    type: 'insurance',
    logo: 'shield',
    urlTemplate: (destination) => 
      `https://www.worldnomads.com/travel-insurance?destination=${encodeURIComponent(destination)}`,
    tagline: 'Travel insurance for adventurers',
    color: 'bg-purple-500'
  },
  {
    id: 'allianz',
    name: 'Allianz Travel',
    type: 'insurance',
    logo: 'lock',
    urlTemplate: (destination) => 
      `https://www.allianztravelinsurance.com/travel-insurance.htm?destination=${encodeURIComponent(destination)}`,
    tagline: 'Trip protection plans',
    color: 'bg-blue-700'
  },
];

export function getCrossSellByType(type: 'hotel' | 'car' | 'insurance'): CrossSellPartner[] {
  return crossSellPartners.filter(p => p.type === type);
}
