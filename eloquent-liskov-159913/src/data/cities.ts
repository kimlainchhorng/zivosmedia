/**
 * City Database for Hotel Search
 * Uses slugs for URL-safe routing and display names for UI
 */

export interface City {
  id: string;           // Unique identifier
  slug: string;         // URL-safe slug (e.g., "phnom-penh")
  name: string;         // Display name (e.g., "Phnom Penh")
  country: string;      // Country name
  countryCode: string;  // ISO country code
  region?: string;      // State/Province
  lat?: number;
  lng?: number;
  popularity?: number;  // For sorting search results
}

// Popular cities for hotel search
export const CITIES: City[] = [
  // Asia - Southeast
  { id: 'pnh', slug: 'phnom-penh', name: 'Phnom Penh', country: 'Cambodia', countryCode: 'KH', lat: 11.5564, lng: 104.9282, popularity: 85 },
  { id: 'rep', slug: 'siem-reap', name: 'Siem Reap', country: 'Cambodia', countryCode: 'KH', lat: 13.3671, lng: 103.8448, popularity: 90 },
  { id: 'shv', slug: 'sihanoukville', name: 'Sihanoukville', country: 'Cambodia', countryCode: 'KH', lat: 10.6093, lng: 103.5229, popularity: 70 },
  { id: 'btb', slug: 'battambang', name: 'Battambang', country: 'Cambodia', countryCode: 'KH', lat: 13.1023, lng: 103.1986, popularity: 55 },
  { id: 'bkk', slug: 'bangkok', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', popularity: 98 },
  { id: 'hkt', slug: 'phuket', name: 'Phuket', country: 'Thailand', countryCode: 'TH', popularity: 95 },
  { id: 'cnx', slug: 'chiang-mai', name: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', popularity: 88 },
  { id: 'sgn', slug: 'ho-chi-minh-city', name: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', popularity: 92 },
  { id: 'han', slug: 'hanoi', name: 'Hanoi', country: 'Vietnam', countryCode: 'VN', popularity: 90 },
  { id: 'sin', slug: 'singapore', name: 'Singapore', country: 'Singapore', countryCode: 'SG', popularity: 98 },
  { id: 'kul', slug: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', popularity: 94 },
  { id: 'dps', slug: 'bali', name: 'Bali', country: 'Indonesia', countryCode: 'ID', popularity: 97 },
  { id: 'jkt', slug: 'jakarta', name: 'Jakarta', country: 'Indonesia', countryCode: 'ID', popularity: 85 },
  { id: 'mnl', slug: 'manila', name: 'Manila', country: 'Philippines', countryCode: 'PH', popularity: 85 },
  { id: 'ceb', slug: 'cebu', name: 'Cebu', country: 'Philippines', countryCode: 'PH', popularity: 82 },
  
  // Asia - East
  { id: 'tyo', slug: 'tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', popularity: 99 },
  { id: 'osa', slug: 'osaka', name: 'Osaka', country: 'Japan', countryCode: 'JP', popularity: 95 },
  { id: 'kyo', slug: 'kyoto', name: 'Kyoto', country: 'Japan', countryCode: 'JP', popularity: 94 },
  { id: 'sel', slug: 'seoul', name: 'Seoul', country: 'South Korea', countryCode: 'KR', popularity: 96 },
  { id: 'hkg', slug: 'hong-kong', name: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', popularity: 95 },
  { id: 'tpe', slug: 'taipei', name: 'Taipei', country: 'Taiwan', countryCode: 'TW', popularity: 90 },
  { id: 'sha', slug: 'shanghai', name: 'Shanghai', country: 'China', countryCode: 'CN', popularity: 92 },
  { id: 'pek', slug: 'beijing', name: 'Beijing', country: 'China', countryCode: 'CN', popularity: 90 },
  
  // Asia - South
  { id: 'del', slug: 'new-delhi', name: 'New Delhi', country: 'India', countryCode: 'IN', popularity: 90 },
  { id: 'bom', slug: 'mumbai', name: 'Mumbai', country: 'India', countryCode: 'IN', popularity: 92 },
  { id: 'blr', slug: 'bangalore', name: 'Bangalore', country: 'India', countryCode: 'IN', popularity: 85 },
  { id: 'goa', slug: 'goa', name: 'Goa', country: 'India', countryCode: 'IN', popularity: 88 },
  { id: 'mle', slug: 'maldives', name: 'Maldives', country: 'Maldives', countryCode: 'MV', popularity: 95 },
  { id: 'cmb', slug: 'colombo', name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', popularity: 82 },
  
  // Middle East
  { id: 'dxb', slug: 'dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', popularity: 98 },
  { id: 'auh', slug: 'abu-dhabi', name: 'Abu Dhabi', country: 'United Arab Emirates', countryCode: 'AE', popularity: 90 },
  { id: 'doh', slug: 'doha', name: 'Doha', country: 'Qatar', countryCode: 'QA', popularity: 85 },
  { id: 'ist', slug: 'istanbul', name: 'Istanbul', country: 'Turkey', countryCode: 'TR', popularity: 95 },
  { id: 'tlv', slug: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', countryCode: 'IL', popularity: 88 },
  
  // Europe - Western
  { id: 'lon', slug: 'london', name: 'London', country: 'United Kingdom', countryCode: 'GB', popularity: 99 },
  { id: 'par', slug: 'paris', name: 'Paris', country: 'France', countryCode: 'FR', popularity: 99 },
  { id: 'ams', slug: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', popularity: 96 },
  { id: 'bcn', slug: 'barcelona', name: 'Barcelona', country: 'Spain', countryCode: 'ES', popularity: 97 },
  { id: 'mad', slug: 'madrid', name: 'Madrid', country: 'Spain', countryCode: 'ES', popularity: 94 },
  { id: 'rom', slug: 'rome', name: 'Rome', country: 'Italy', countryCode: 'IT', popularity: 98 },
  { id: 'mil', slug: 'milan', name: 'Milan', country: 'Italy', countryCode: 'IT', popularity: 92 },
  { id: 'ven', slug: 'venice', name: 'Venice', country: 'Italy', countryCode: 'IT', popularity: 94 },
  { id: 'flo', slug: 'florence', name: 'Florence', country: 'Italy', countryCode: 'IT', popularity: 92 },
  { id: 'ber', slug: 'berlin', name: 'Berlin', country: 'Germany', countryCode: 'DE', popularity: 95 },
  { id: 'muc', slug: 'munich', name: 'Munich', country: 'Germany', countryCode: 'DE', popularity: 90 },
  { id: 'vie', slug: 'vienna', name: 'Vienna', country: 'Austria', countryCode: 'AT', popularity: 92 },
  { id: 'zrh', slug: 'zurich', name: 'Zurich', country: 'Switzerland', countryCode: 'CH', popularity: 88 },
  { id: 'bru', slug: 'brussels', name: 'Brussels', country: 'Belgium', countryCode: 'BE', popularity: 85 },
  { id: 'lis', slug: 'lisbon', name: 'Lisbon', country: 'Portugal', countryCode: 'PT', popularity: 94 },
  { id: 'dub', slug: 'dublin', name: 'Dublin', country: 'Ireland', countryCode: 'IE', popularity: 90 },
  
  // Europe - Eastern
  { id: 'prg', slug: 'prague', name: 'Prague', country: 'Czech Republic', countryCode: 'CZ', popularity: 95 },
  { id: 'bud', slug: 'budapest', name: 'Budapest', country: 'Hungary', countryCode: 'HU', popularity: 93 },
  { id: 'waw', slug: 'warsaw', name: 'Warsaw', country: 'Poland', countryCode: 'PL', popularity: 85 },
  { id: 'krk', slug: 'krakow', name: 'Krakow', country: 'Poland', countryCode: 'PL', popularity: 88 },
  { id: 'ath', slug: 'athens', name: 'Athens', country: 'Greece', countryCode: 'GR', popularity: 92 },
  { id: 'san', slug: 'santorini', name: 'Santorini', country: 'Greece', countryCode: 'GR', popularity: 95 },
  { id: 'dbv', slug: 'dubrovnik', name: 'Dubrovnik', country: 'Croatia', countryCode: 'HR', popularity: 90 },
  
  // Europe - Nordic
  { id: 'cph', slug: 'copenhagen', name: 'Copenhagen', country: 'Denmark', countryCode: 'DK', popularity: 90 },
  { id: 'sto', slug: 'stockholm', name: 'Stockholm', country: 'Sweden', countryCode: 'SE', popularity: 88 },
  { id: 'osl', slug: 'oslo', name: 'Oslo', country: 'Norway', countryCode: 'NO', popularity: 85 },
  { id: 'hel', slug: 'helsinki', name: 'Helsinki', country: 'Finland', countryCode: 'FI', popularity: 82 },
  { id: 'rkv', slug: 'reykjavik', name: 'Reykjavik', country: 'Iceland', countryCode: 'IS', popularity: 88 },
  
  // Americas - North
  { id: 'nyc', slug: 'new-york', name: 'New York', country: 'United States', countryCode: 'US', region: 'New York', popularity: 99 },
  { id: 'lax', slug: 'los-angeles', name: 'Los Angeles', country: 'United States', countryCode: 'US', region: 'California', popularity: 98 },
  { id: 'mia', slug: 'miami', name: 'Miami', country: 'United States', countryCode: 'US', region: 'Florida', popularity: 96 },
  { id: 'las', slug: 'las-vegas', name: 'Las Vegas', country: 'United States', countryCode: 'US', region: 'Nevada', popularity: 97 },
  { id: 'sfo', slug: 'san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', region: 'California', popularity: 94 },
  { id: 'chi', slug: 'chicago', name: 'Chicago', country: 'United States', countryCode: 'US', region: 'Illinois', popularity: 92 },
  { id: 'orl', slug: 'orlando', name: 'Orlando', country: 'United States', countryCode: 'US', region: 'Florida', popularity: 95 },
  { id: 'sea', slug: 'seattle', name: 'Seattle', country: 'United States', countryCode: 'US', region: 'Washington', popularity: 88 },
  { id: 'bos', slug: 'boston', name: 'Boston', country: 'United States', countryCode: 'US', region: 'Massachusetts', popularity: 90 },
  { id: 'was', slug: 'washington-dc', name: 'Washington DC', country: 'United States', countryCode: 'US', popularity: 92 },
  { id: 'hnl', slug: 'honolulu', name: 'Honolulu', country: 'United States', countryCode: 'US', region: 'Hawaii', popularity: 94 },
  { id: 'msy', slug: 'new-orleans', name: 'New Orleans', country: 'United States', countryCode: 'US', region: 'Louisiana', popularity: 88 },
  { id: 'yyz', slug: 'toronto', name: 'Toronto', country: 'Canada', countryCode: 'CA', popularity: 92 },
  { id: 'yvr', slug: 'vancouver', name: 'Vancouver', country: 'Canada', countryCode: 'CA', popularity: 90 },
  { id: 'yul', slug: 'montreal', name: 'Montreal', country: 'Canada', countryCode: 'CA', popularity: 88 },
  { id: 'mex', slug: 'mexico-city', name: 'Mexico City', country: 'Mexico', countryCode: 'MX', popularity: 90 },
  { id: 'cun', slug: 'cancun', name: 'Cancun', country: 'Mexico', countryCode: 'MX', popularity: 96 },
  
  // Americas - South & Caribbean
  { id: 'rio', slug: 'rio-de-janeiro', name: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', popularity: 94 },
  { id: 'sao', slug: 'sao-paulo', name: 'São Paulo', country: 'Brazil', countryCode: 'BR', popularity: 88 },
  { id: 'bue', slug: 'buenos-aires', name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', popularity: 92 },
  { id: 'bog', slug: 'bogota', name: 'Bogota', country: 'Colombia', countryCode: 'CO', popularity: 85 },
  { id: 'lim', slug: 'lima', name: 'Lima', country: 'Peru', countryCode: 'PE', popularity: 88 },
  { id: 'cuz', slug: 'cusco', name: 'Cusco', country: 'Peru', countryCode: 'PE', popularity: 90 },
  { id: 'scl', slug: 'santiago', name: 'Santiago', country: 'Chile', countryCode: 'CL', popularity: 85 },
  { id: 'nas', slug: 'nassau', name: 'Nassau', country: 'Bahamas', countryCode: 'BS', popularity: 88 },
  { id: 'puj', slug: 'punta-cana', name: 'Punta Cana', country: 'Dominican Republic', countryCode: 'DO', popularity: 92 },
  { id: 'sjd', slug: 'cabo-san-lucas', name: 'Cabo San Lucas', country: 'Mexico', countryCode: 'MX', popularity: 90 },
  
  // Africa
  { id: 'cpt', slug: 'cape-town', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', popularity: 92 },
  { id: 'jnb', slug: 'johannesburg', name: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', popularity: 85 },
  { id: 'cai', slug: 'cairo', name: 'Cairo', country: 'Egypt', countryCode: 'EG', popularity: 90 },
  { id: 'rak', slug: 'marrakech', name: 'Marrakech', country: 'Morocco', countryCode: 'MA', popularity: 92 },
  { id: 'nbo', slug: 'nairobi', name: 'Nairobi', country: 'Kenya', countryCode: 'KE', popularity: 82 },
  { id: 'dar', slug: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzania', countryCode: 'TZ', popularity: 78 },
  { id: 'znz', slug: 'zanzibar', name: 'Zanzibar', country: 'Tanzania', countryCode: 'TZ', popularity: 88 },
  { id: 'mus', slug: 'mauritius', name: 'Mauritius', country: 'Mauritius', countryCode: 'MU', popularity: 90 },
  { id: 'sey', slug: 'seychelles', name: 'Seychelles', country: 'Seychelles', countryCode: 'SC', popularity: 88 },
  
  // Oceania
  { id: 'syd', slug: 'sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', popularity: 96 },
  { id: 'mel', slug: 'melbourne', name: 'Melbourne', country: 'Australia', countryCode: 'AU', popularity: 94 },
  { id: 'bne', slug: 'brisbane', name: 'Brisbane', country: 'Australia', countryCode: 'AU', popularity: 85 },
  { id: 'gld', slug: 'gold-coast', name: 'Gold Coast', country: 'Australia', countryCode: 'AU', popularity: 88 },
  { id: 'per', slug: 'perth', name: 'Perth', country: 'Australia', countryCode: 'AU', popularity: 82 },
  { id: 'akl', slug: 'auckland', name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', popularity: 88 },
  { id: 'qtn', slug: 'queenstown', name: 'Queenstown', country: 'New Zealand', countryCode: 'NZ', popularity: 90 },
  { id: 'fji', slug: 'fiji', name: 'Fiji', country: 'Fiji', countryCode: 'FJ', popularity: 88 },
  { id: 'ppt', slug: 'tahiti', name: 'Tahiti', country: 'French Polynesia', countryCode: 'PF', popularity: 85 },
];

/**
 * Get city by slug
 */
export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug.toLowerCase());
}

/**
 * Get city by ID
 */
export function getCityById(id: string): City | undefined {
  return CITIES.find(c => c.id === id.toLowerCase());
}

/**
 * Search cities by name (for autocomplete)
 */
export function searchCities(query: string, limit: number = 10): City[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  const matches = CITIES.filter(city => 
    city.name.toLowerCase().includes(normalizedQuery) ||
    city.country.toLowerCase().includes(normalizedQuery) ||
    city.slug.includes(normalizedQuery)
  );
  
  // Sort by popularity and relevance
  matches.sort((a, b) => {
    const aStartsWithQuery = a.name.toLowerCase().startsWith(normalizedQuery);
    const bStartsWithQuery = b.name.toLowerCase().startsWith(normalizedQuery);
    
    if (aStartsWithQuery && !bStartsWithQuery) return -1;
    if (!aStartsWithQuery && bStartsWithQuery) return 1;
    
    return (b.popularity || 0) - (a.popularity || 0);
  });
  
  return matches.slice(0, limit);
}

/**
 * Get popular cities for hotel search
 */
export function getPopularCities(limit: number = 12): City[] {
  return [...CITIES]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, limit);
}

/**
 * Convert city name to slug
 */
export function cityNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
