/**
 * PROGRAMMATIC SEO CONFIGURATION
 * 
 * Centralized data for auto-generating SEO landing pages:
 * - Flight routes (city-to-city, airport-to-airport)
 * - Hotel cities
 * - Car rental locations
 * - Seasonal deals
 * 
 * Target: 1,000 SEO pages = 50k-100k monthly users
 */

// ============================================
// FLIGHT ROUTES - City to City
// ============================================

export interface FlightRoute {
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  /** Priority 1-3 (1 = highest) */
  priority: 1 | 2 | 3;
  /** Estimated monthly search volume */
  searchVolume?: number;
}

/** Top 50 US domestic routes */
export const US_DOMESTIC_ROUTES: FlightRoute[] = [
  { from: "new-york", to: "los-angeles", fromCode: "JFK", toCode: "LAX", priority: 1, searchVolume: 45000 },
  { from: "new-york", to: "miami", fromCode: "JFK", toCode: "MIA", priority: 1, searchVolume: 38000 },
  { from: "new-york", to: "san-francisco", fromCode: "JFK", toCode: "SFO", priority: 1, searchVolume: 32000 },
  { from: "new-york", to: "chicago", fromCode: "JFK", toCode: "ORD", priority: 1, searchVolume: 28000 },
  { from: "new-york", to: "las-vegas", fromCode: "JFK", toCode: "LAS", priority: 1, searchVolume: 35000 },
  { from: "los-angeles", to: "new-york", fromCode: "LAX", toCode: "JFK", priority: 1, searchVolume: 42000 },
  { from: "los-angeles", to: "san-francisco", fromCode: "LAX", toCode: "SFO", priority: 2, searchVolume: 22000 },
  { from: "los-angeles", to: "las-vegas", fromCode: "LAX", toCode: "LAS", priority: 2, searchVolume: 25000 },
  { from: "los-angeles", to: "seattle", fromCode: "LAX", toCode: "SEA", priority: 2, searchVolume: 18000 },
  { from: "los-angeles", to: "denver", fromCode: "LAX", toCode: "DEN", priority: 2, searchVolume: 15000 },
  { from: "chicago", to: "new-york", fromCode: "ORD", toCode: "JFK", priority: 1, searchVolume: 26000 },
  { from: "chicago", to: "los-angeles", fromCode: "ORD", toCode: "LAX", priority: 2, searchVolume: 18000 },
  { from: "chicago", to: "miami", fromCode: "ORD", toCode: "MIA", priority: 2, searchVolume: 14000 },
  { from: "miami", to: "new-york", fromCode: "MIA", toCode: "JFK", priority: 1, searchVolume: 35000 },
  { from: "miami", to: "los-angeles", fromCode: "MIA", toCode: "LAX", priority: 2, searchVolume: 12000 },
  { from: "san-francisco", to: "new-york", fromCode: "SFO", toCode: "JFK", priority: 1, searchVolume: 28000 },
  { from: "san-francisco", to: "los-angeles", fromCode: "SFO", toCode: "LAX", priority: 2, searchVolume: 20000 },
  { from: "seattle", to: "los-angeles", fromCode: "SEA", toCode: "LAX", priority: 2, searchVolume: 15000 },
  { from: "seattle", to: "san-francisco", fromCode: "SEA", toCode: "SFO", priority: 2, searchVolume: 12000 },
  { from: "denver", to: "los-angeles", fromCode: "DEN", toCode: "LAX", priority: 2, searchVolume: 14000 },
  { from: "boston", to: "new-york", fromCode: "BOS", toCode: "JFK", priority: 2, searchVolume: 18000 },
  { from: "boston", to: "miami", fromCode: "BOS", toCode: "MIA", priority: 2, searchVolume: 12000 },
  { from: "atlanta", to: "new-york", fromCode: "ATL", toCode: "JFK", priority: 2, searchVolume: 16000 },
  { from: "atlanta", to: "los-angeles", fromCode: "ATL", toCode: "LAX", priority: 2, searchVolume: 14000 },
  { from: "dallas", to: "new-york", fromCode: "DFW", toCode: "JFK", priority: 2, searchVolume: 15000 },
  { from: "dallas", to: "los-angeles", fromCode: "DFW", toCode: "LAX", priority: 2, searchVolume: 13000 },
  { from: "phoenix", to: "los-angeles", fromCode: "PHX", toCode: "LAX", priority: 3, searchVolume: 8000 },
  { from: "honolulu", to: "los-angeles", fromCode: "HNL", toCode: "LAX", priority: 2, searchVolume: 18000 },
  { from: "honolulu", to: "san-francisco", fromCode: "HNL", toCode: "SFO", priority: 2, searchVolume: 14000 },
  { from: "new-york", to: "orlando", fromCode: "JFK", toCode: "MCO", priority: 1, searchVolume: 32000 },
];

/** Top international routes from US */
export const US_INTERNATIONAL_ROUTES: FlightRoute[] = [
  { from: "new-york", to: "london", fromCode: "JFK", toCode: "LHR", priority: 1, searchVolume: 55000 },
  { from: "new-york", to: "paris", fromCode: "JFK", toCode: "CDG", priority: 1, searchVolume: 42000 },
  { from: "new-york", to: "tokyo", fromCode: "JFK", toCode: "NRT", priority: 1, searchVolume: 28000 },
  { from: "new-york", to: "rome", fromCode: "JFK", toCode: "FCO", priority: 2, searchVolume: 22000 },
  { from: "new-york", to: "dublin", fromCode: "JFK", toCode: "DUB", priority: 2, searchVolume: 18000 },
  { from: "new-york", to: "cancun", fromCode: "JFK", toCode: "CUN", priority: 1, searchVolume: 38000 },
  { from: "new-york", to: "barcelona", fromCode: "JFK", toCode: "BCN", priority: 2, searchVolume: 20000 },
  { from: "los-angeles", to: "london", fromCode: "LAX", toCode: "LHR", priority: 1, searchVolume: 35000 },
  { from: "los-angeles", to: "tokyo", fromCode: "LAX", toCode: "NRT", priority: 1, searchVolume: 32000 },
  { from: "los-angeles", to: "paris", fromCode: "LAX", toCode: "CDG", priority: 2, searchVolume: 25000 },
  { from: "los-angeles", to: "sydney", fromCode: "LAX", toCode: "SYD", priority: 2, searchVolume: 18000 },
  { from: "los-angeles", to: "cancun", fromCode: "LAX", toCode: "CUN", priority: 2, searchVolume: 22000 },
  { from: "san-francisco", to: "tokyo", fromCode: "SFO", toCode: "NRT", priority: 1, searchVolume: 28000 },
  { from: "san-francisco", to: "london", fromCode: "SFO", toCode: "LHR", priority: 2, searchVolume: 18000 },
  { from: "chicago", to: "london", fromCode: "ORD", toCode: "LHR", priority: 2, searchVolume: 20000 },
  { from: "chicago", to: "paris", fromCode: "ORD", toCode: "CDG", priority: 2, searchVolume: 15000 },
  { from: "miami", to: "cancun", fromCode: "MIA", toCode: "CUN", priority: 1, searchVolume: 28000 },
  { from: "miami", to: "london", fromCode: "MIA", toCode: "LHR", priority: 2, searchVolume: 14000 },
  { from: "boston", to: "london", fromCode: "BOS", toCode: "LHR", priority: 2, searchVolume: 18000 },
  { from: "boston", to: "dublin", fromCode: "BOS", toCode: "DUB", priority: 2, searchVolume: 16000 },
];

// ============================================
// CITY DESTINATION PAGES
// ============================================

export interface DestinationCity {
  slug: string;
  name: string;
  country: string;
  iataCode: string;
  /** Services available: flights, hotels, cars */
  services: ('flights' | 'hotels' | 'cars')[];
  priority: 1 | 2 | 3;
}

export const DESTINATION_CITIES: DestinationCity[] = [
  // US Cities
  { slug: "new-york", name: "New York", country: "USA", iataCode: "JFK", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "los-angeles", name: "Los Angeles", country: "USA", iataCode: "LAX", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "miami", name: "Miami", country: "USA", iataCode: "MIA", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "las-vegas", name: "Las Vegas", country: "USA", iataCode: "LAS", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "san-francisco", name: "San Francisco", country: "USA", iataCode: "SFO", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "chicago", name: "Chicago", country: "USA", iataCode: "ORD", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "orlando", name: "Orlando", country: "USA", iataCode: "MCO", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "seattle", name: "Seattle", country: "USA", iataCode: "SEA", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "boston", name: "Boston", country: "USA", iataCode: "BOS", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "denver", name: "Denver", country: "USA", iataCode: "DEN", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "honolulu", name: "Honolulu", country: "USA", iataCode: "HNL", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "dallas", name: "Dallas", country: "USA", iataCode: "DFW", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "phoenix", name: "Phoenix", country: "USA", iataCode: "PHX", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "atlanta", name: "Atlanta", country: "USA", iataCode: "ATL", services: ["flights", "hotels", "cars"], priority: 2 },
  
  // International Cities
  { slug: "london", name: "London", country: "UK", iataCode: "LHR", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "paris", name: "Paris", country: "France", iataCode: "CDG", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "tokyo", name: "Tokyo", country: "Japan", iataCode: "NRT", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "rome", name: "Rome", country: "Italy", iataCode: "FCO", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "barcelona", name: "Barcelona", country: "Spain", iataCode: "BCN", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "dublin", name: "Dublin", country: "Ireland", iataCode: "DUB", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "cancun", name: "Cancún", country: "Mexico", iataCode: "CUN", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "amsterdam", name: "Amsterdam", country: "Netherlands", iataCode: "AMS", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "dubai", name: "Dubai", country: "UAE", iataCode: "DXB", services: ["flights", "hotels", "cars"], priority: 1 },
  { slug: "sydney", name: "Sydney", country: "Australia", iataCode: "SYD", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "singapore", name: "Singapore", country: "Singapore", iataCode: "SIN", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "toronto", name: "Toronto", country: "Canada", iataCode: "YYZ", services: ["flights", "hotels", "cars"], priority: 2 },
  { slug: "vancouver", name: "Vancouver", country: "Canada", iataCode: "YVR", services: ["flights", "hotels", "cars"], priority: 2 },
];

// ============================================
// SEASONAL DEALS
// ============================================

export interface SeasonalDeal {
  slug: string;
  title: string;
  description: string;
  /** Active months (1-12) */
  activeMonths: number[];
  services: ('flights' | 'hotels' | 'cars')[];
}

export const SEASONAL_DEALS: SeasonalDeal[] = [
  {
    slug: "summer-flights",
    title: "Summer Flight Deals",
    description: "Find the best summer flight deals to top vacation destinations.",
    activeMonths: [5, 6, 7, 8],
    services: ["flights"],
  },
  {
    slug: "winter-getaways",
    title: "Winter Getaway Deals",
    description: "Escape the cold with flights to warm destinations.",
    activeMonths: [11, 12, 1, 2],
    services: ["flights", "hotels"],
  },
  {
    slug: "spring-break",
    title: "Spring Break Travel Deals",
    description: "Book your spring break flights and hotels at great prices.",
    activeMonths: [3, 4],
    services: ["flights", "hotels"],
  },
  {
    slug: "holiday-travel",
    title: "Holiday Travel Deals",
    description: "Find affordable flights for Thanksgiving and Christmas.",
    activeMonths: [11, 12],
    services: ["flights"],
  },
  {
    slug: "last-minute-flights",
    title: "Last Minute Flight Deals",
    description: "Spontaneous travel? Find last-minute flight deals.",
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    services: ["flights"],
  },
  {
    slug: "weekend-getaways",
    title: "Weekend Getaway Deals",
    description: "Short trips, great prices. Book your weekend escape.",
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    services: ["flights", "hotels", "cars"],
  },
];

// ============================================
// UTILITIES
// ============================================

/** Get all routes (domestic + international) */
export function getAllFlightRoutes(): FlightRoute[] {
  return [...US_DOMESTIC_ROUTES, ...US_INTERNATIONAL_ROUTES];
}

/** Get routes by priority */
export function getRoutesByPriority(priority: 1 | 2 | 3): FlightRoute[] {
  return getAllFlightRoutes().filter(r => r.priority === priority);
}

/** Get cities by service type */
export function getCitiesByService(service: 'flights' | 'hotels' | 'cars'): DestinationCity[] {
  return DESTINATION_CITIES.filter(c => c.services.includes(service));
}

/** Get active seasonal deals for current month */
export function getActiveSeasonalDeals(): SeasonalDeal[] {
  const currentMonth = new Date().getMonth() + 1;
  return SEASONAL_DEALS.filter(d => d.activeMonths.includes(currentMonth));
}

/** Generate URL for flight route page */
export function getFlightRouteUrl(route: FlightRoute): string {
  return `/flights/${route.from}-to-${route.to}`;
}

/** Generate URL for city flights page */
export function getFlightToCityUrl(city: DestinationCity): string {
  return `/flights/to-${city.slug}`;
}

/** Generate URL for hotel city page */
export function getHotelCityUrl(city: DestinationCity): string {
  return `/hotels/${city.slug}`;
}

/** Generate URL for car rental city page */
export function getCarRentalCityUrl(city: DestinationCity): string {
  return `/car-rentals/${city.slug}`;
}

/** Generate URL for seasonal deal page */
export function getSeasonalDealUrl(deal: SeasonalDeal): string {
  return `/deals/${deal.slug}`;
}

/** Get total page count for all programmatic SEO pages */
export function getTotalSEOPageCount(): number {
  const routes = getAllFlightRoutes().length;
  const flightCities = getCitiesByService('flights').length;
  const hotelCities = getCitiesByService('hotels').length;
  const carCities = getCitiesByService('cars').length;
  const deals = SEASONAL_DEALS.length;
  
  return routes + flightCities + hotelCities + carCities + deals;
}
