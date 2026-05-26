import { useQuery } from "@tanstack/react-query";
import { allAirlines, getAirlineLogo, getAirlineByCode, type Airline } from "@/data/airlines";
import { airports } from "@/data/airports";
import type { GeneratedFlight } from "@/data/flightGenerator";

/**
 * AFFILIATE-ONLY MODEL:
 * This hook generates indicative flight data for display purposes only.
 * All actual prices are shown on partner sites after redirect.
 * We do NOT call any external APIs for pricing data.
 */

interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  currency?: string;
  enabled?: boolean;
}

// Extended airline fallback for codes not in main database
const extendedAirlineInfo: Record<string, { name: string; category: Airline['category']; alliance: string }> = {
  // Major US Airlines
  'AA': { name: 'American Airlines', category: 'full-service', alliance: 'Oneworld' },
  'DL': { name: 'Delta Air Lines', category: 'full-service', alliance: 'SkyTeam' },
  'UA': { name: 'United Airlines', category: 'full-service', alliance: 'Star Alliance' },
  'WN': { name: 'Southwest Airlines', category: 'low-cost', alliance: 'Independent' },
  'B6': { name: 'JetBlue Airways', category: 'full-service', alliance: 'Independent' },
  'AS': { name: 'Alaska Airlines', category: 'full-service', alliance: 'Oneworld' },
  'NK': { name: 'Spirit Airlines', category: 'low-cost', alliance: 'Independent' },
  'F9': { name: 'Frontier Airlines', category: 'low-cost', alliance: 'Independent' },
  // European
  'BA': { name: 'British Airways', category: 'full-service', alliance: 'Oneworld' },
  'AF': { name: 'Air France', category: 'full-service', alliance: 'SkyTeam' },
  'LH': { name: 'Lufthansa', category: 'full-service', alliance: 'Star Alliance' },
  'KL': { name: 'KLM Royal Dutch', category: 'full-service', alliance: 'SkyTeam' },
  'IB': { name: 'Iberia', category: 'full-service', alliance: 'Oneworld' },
  'AZ': { name: 'ITA Airways', category: 'full-service', alliance: 'SkyTeam' },
  'SK': { name: 'SAS Scandinavian', category: 'full-service', alliance: 'SkyTeam' },
  'LX': { name: 'Swiss International', category: 'full-service', alliance: 'Star Alliance' },
  'OS': { name: 'Austrian Airlines', category: 'full-service', alliance: 'Star Alliance' },
  'SN': { name: 'Brussels Airlines', category: 'full-service', alliance: 'Star Alliance' },
  'TP': { name: 'TAP Air Portugal', category: 'full-service', alliance: 'Star Alliance' },
  'AY': { name: 'Finnair', category: 'full-service', alliance: 'Oneworld' },
  'EI': { name: 'Aer Lingus', category: 'full-service', alliance: 'Independent' },
  'U2': { name: 'easyJet', category: 'low-cost', alliance: 'Independent' },
  'FR': { name: 'Ryanair', category: 'low-cost', alliance: 'Independent' },
  'VY': { name: 'Vueling', category: 'low-cost', alliance: 'Independent' },
  'W6': { name: 'Wizz Air', category: 'low-cost', alliance: 'Independent' },
  'DY': { name: 'Norwegian', category: 'low-cost', alliance: 'Independent' },
  // Middle East
  'EK': { name: 'Emirates', category: 'premium', alliance: 'Independent' },
  'QR': { name: 'Qatar Airways', category: 'premium', alliance: 'Oneworld' },
  'EY': { name: 'Etihad Airways', category: 'premium', alliance: 'Independent' },
  'TK': { name: 'Turkish Airlines', category: 'full-service', alliance: 'Star Alliance' },
  'MS': { name: 'EgyptAir', category: 'full-service', alliance: 'Star Alliance' },
  // Asia Pacific
  'CX': { name: 'Cathay Pacific', category: 'premium', alliance: 'Oneworld' },
  'JL': { name: 'Japan Airlines', category: 'full-service', alliance: 'Oneworld' },
  'NH': { name: 'All Nippon Airways', category: 'full-service', alliance: 'Star Alliance' },
  'KE': { name: 'Korean Air', category: 'full-service', alliance: 'SkyTeam' },
  'OZ': { name: 'Asiana Airlines', category: 'full-service', alliance: 'Star Alliance' },
  'TG': { name: 'Thai Airways', category: 'full-service', alliance: 'Star Alliance' },
  'MH': { name: 'Malaysia Airlines', category: 'full-service', alliance: 'Oneworld' },
  'SQ': { name: 'Singapore Airlines', category: 'premium', alliance: 'Star Alliance' },
  'QF': { name: 'Qantas', category: 'full-service', alliance: 'Oneworld' },
  'NZ': { name: 'Air New Zealand', category: 'full-service', alliance: 'Star Alliance' },
  'VA': { name: 'Virgin Australia', category: 'full-service', alliance: 'Independent' },
  // Low-cost Asia
  'AK': { name: 'AirAsia', category: 'low-cost', alliance: 'Independent' },
  'TR': { name: 'Scoot', category: 'low-cost', alliance: 'Independent' },
  '5J': { name: 'Cebu Pacific', category: 'low-cost', alliance: 'Independent' },
  // Americas
  'AC': { name: 'Air Canada', category: 'full-service', alliance: 'Star Alliance' },
  'AM': { name: 'Aeromexico', category: 'full-service', alliance: 'SkyTeam' },
  'LA': { name: 'LATAM Airlines', category: 'full-service', alliance: 'Independent' },
  'AV': { name: 'Avianca', category: 'full-service', alliance: 'Star Alliance' },
  'CM': { name: 'Copa Airlines', category: 'full-service', alliance: 'Star Alliance' },
  'G3': { name: 'GOL Linhas Aéreas', category: 'low-cost', alliance: 'Independent' },
};

// Map airline code to full airline info from our database with fallback
const getAirlineInfo = (code: string): { name: string; category: Airline['category']; alliance: string; code: string } => {
  // First try our main airline database
  const airline = getAirlineByCode(code);
  if (airline) {
    return {
      code: airline.code,
      name: airline.name,
      category: airline.category,
      alliance: airline.alliance || 'Independent'
    };
  }
  
  // Then try extended fallback database
  const extended = extendedAirlineInfo[code];
  if (extended) {
    return {
      code,
      name: extended.name,
      category: extended.category,
      alliance: extended.alliance
    };
  }
  
  // Default fallback - use code as name
  return {
    code,
    name: code,
    category: 'full-service',
    alliance: 'Independent'
  };
};

// Calculate approximate distance between airports (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Route-based indicative pricing using actual airport coordinates
const getIndicativePricing = (fromCode: string, toCode: string): { minPrice: number; maxPrice: number; duration: number } => {
  const fromAirport = airports.find(a => a.code === fromCode);
  const toAirport = airports.find(a => a.code === toCode);
  
  // Calculate distance-based pricing
  let distance = 5000; // default for unknown airports
  if (fromAirport && toAirport) {
    distance = calculateDistance(fromAirport.lat, fromAirport.lng, toAirport.lat, toAirport.lng);
  }
  
  // Price per km varies by distance (longer = cheaper per km due to fixed costs)
  const pricePerKm = distance < 1500 ? 0.12 : distance < 5000 ? 0.08 : distance < 10000 ? 0.06 : 0.05;
  const basePrice = Math.round(distance * pricePerKm);
  
  // Duration estimate: ~800 km/h average including taxi, takeoff, landing
  const flightDuration = Math.round((distance / 750) * 60 + 60); // Add 60 min for ground operations
  
  // Price range
  const minPrice = Math.max(89, Math.round(basePrice * 0.7));
  const maxPrice = Math.round(basePrice * 1.8);
  
  return { minPrice, maxPrice, duration: flightDuration };
};

// Generate indicative flights for display (affiliate redirect for real prices)
const generateIndicativeFlights = (
  fromCode: string,
  toCode: string,
  departureDate?: string
): GeneratedFlight[] => {
  const fromAirport = airports.find(a => a.code === fromCode);
  const toAirport = airports.find(a => a.code === toCode);
  const pricing = getIndicativePricing(fromCode, toCode);
  
  // Airlines that commonly fly various routes - mix of categories
  const airlineCodes = ['AA', 'DL', 'UA', 'BA', 'AF', 'LH', 'EK', 'B6', 'AS', 'QR', 'SQ', 'WN'];
  const flights: GeneratedFlight[] = [];
  
  // Generate 8-12 indicative flight options
  const numFlights = 8 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < numFlights; i++) {
    const airlineCode = airlineCodes[i % airlineCodes.length];
    const airlineInfo = getAirlineInfo(airlineCode);
    
    // Varied departure times throughout the day
    const depHour = 5 + (i * 2) % 18; // 5am to 11pm
    const depMinutes = [0, 15, 30, 45][i % 4];
    const depTimeStr = `${depHour.toString().padStart(2, '0')}:${depMinutes.toString().padStart(2, '0')}`;
    
    // Use calculated duration from pricing, with variation
    const baseDuration = pricing.duration;
    const durationVariation = (i % 3) * 20 - 20; // -20, 0, +20 minutes
    const stopsVariation = i < 4 ? 0 : i < 8 ? 45 : 90; // stops add time
    const duration = Math.max(60, baseDuration + durationVariation + stopsVariation);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = `${hours}h ${minutes}m`;
    
    // Calculate arrival time
    const totalMinutes = depHour * 60 + depMinutes + duration;
    const arrHour = Math.floor(totalMinutes / 60) % 24;
    const arrMinutes = totalMinutes % 60;
    const daysAdded = Math.floor(totalMinutes / (24 * 60));
    const arrTimeStr = daysAdded > 0
      ? `${arrHour.toString().padStart(2, '0')}:${arrMinutes.toString().padStart(2, '0')}+${daysAdded}`
      : `${arrHour.toString().padStart(2, '0')}:${arrMinutes.toString().padStart(2, '0')}`;
    
    // Indicative price (varies by airline category and stops)
    const categoryMultiplier = airlineInfo.category === 'premium' ? 1.5 : airlineInfo.category === 'low-cost' ? 0.65 : 1;
    const stops = i < 4 ? 0 : i < 8 ? 1 : 2;
    const stopsDiscount = stops === 0 ? 1 : stops === 1 ? 0.85 : 0.7;
    const priceSpread = (i / numFlights) * (pricing.maxPrice - pricing.minPrice);
    const basePrice = pricing.minPrice + priceSpread;
    const indicativePrice = Math.round(basePrice * categoryMultiplier * stopsDiscount);

    
    flights.push({
      id: `indicative-${airlineCode}-${i}-${Date.now()}`,
      airline: airlineInfo.name,
      airlineCode,
      flightNumber: `${airlineCode}-${1000 + i * 100}`,
      departure: {
        time: depTimeStr,
        city: fromAirport?.city || fromCode,
        code: fromCode,
        terminal: ['A', 'B', 'C', 'D'][i % 4]
      },
      arrival: {
        time: arrTimeStr,
        city: toAirport?.city || toCode,
        code: toCode,
        terminal: ['1', '2', '3'][i % 3]
      },
      duration: durationStr,
      stops,
      stopCities: stops > 0 ? generateStopCities(stops, fromCode, toCode) : undefined,
      price: indicativePrice,
      premiumEconomyPrice: airlineInfo.category !== 'low-cost' ? Math.round(indicativePrice * 1.6) : undefined,
      businessPrice: airlineInfo.category !== 'low-cost' ? Math.round(indicativePrice * 3.5) : undefined,
      firstPrice: airlineInfo.category === 'premium' ? Math.round(indicativePrice * 8) : undefined,
      class: 'Economy',
      amenities: airlineInfo.category === 'premium' 
        ? ['wifi', 'entertainment', 'meals', 'power', 'lounge'] 
        : airlineInfo.category === 'low-cost' 
          ? ['snacks'] 
          : ['wifi', 'entertainment', 'meals', 'power'],
      seatsLeft: 2 + (i % 10),
      category: airlineInfo.category,
      alliance: airlineInfo.alliance,
      aircraft: 'Boeing 737 MAX / Airbus A320neo',
      onTimePerformance: 75 + (i % 15),
      carbonOffset: Math.round(duration * 0.5),
      baggageIncluded: airlineInfo.category === 'low-cost' ? 'Carry-on only' : '1 × 23kg checked',
      refundable: airlineInfo.category === 'premium',
      wifi: airlineInfo.category !== 'low-cost',
      entertainment: airlineInfo.category !== 'low-cost',
      meals: airlineInfo.category !== 'low-cost',
      legroom: airlineInfo.category === 'premium' ? '34"' : airlineInfo.category === 'low-cost' ? '28"' : '31"',
      logo: getAirlineLogo(airlineCode),
      bookingLink: undefined, // Will be generated on redirect
      isRealPrice: false, // Indicative pricing only
    });
  }
  
  // Sort by price
  return flights.sort((a, b) => a.price - b.price);
};

// Generate realistic stop cities based on route
const generateStopCities = (transfers: number, from: string, to: string): string[] => {
  const hubsByRegion: Record<string, string[]> = {
    us: ['Atlanta', 'Dallas', 'Chicago', 'Denver', 'Charlotte', 'Houston', 'Phoenix'],
    eu: ['London', 'Frankfurt', 'Amsterdam', 'Paris', 'Madrid', 'Munich'],
    me: ['Dubai', 'Doha', 'Istanbul', 'Abu Dhabi'],
    asia: ['Singapore', 'Hong Kong', 'Tokyo', 'Seoul', 'Bangkok'],
  };
  
  const allHubs = Object.values(hubsByRegion).flat();
  const filtered = allHubs.filter(h => 
    !h.toLowerCase().includes(from.toLowerCase()) && 
    !h.toLowerCase().includes(to.toLowerCase())
  );
  
  const stops: string[] = [];
  for (let i = 0; i < transfers && i < filtered.length; i++) {
    const idx = (from.charCodeAt(0) + to.charCodeAt(0) + i) % filtered.length;
    if (!stops.includes(filtered[idx])) {
      stops.push(filtered[idx]);
    }
  }
  
  return stops.length > 0 ? stops : ['Connection'];
};

/**
 * Hook that returns indicative flight data for display.
 * All actual pricing comes from affiliate partner sites on redirect.
 * NO external API calls are made.
 */
export function useRealFlightSearch({
  origin,
  destination,
  departureDate,
  returnDate,
  currency = 'USD',
  enabled = true,
}: FlightSearchParams) {
  return useQuery({
    queryKey: ['indicative-flights', origin, destination, departureDate, returnDate],
    queryFn: async (): Promise<GeneratedFlight[]> => {
      // Generate indicative flight data (no API calls)
      const flights = generateIndicativeFlights(origin, destination, departureDate);
      return flights;
    },
    enabled: enabled && !!origin && !!destination && origin.length === 3 && destination.length === 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook to get combined real + generated flights
export function useCombinedFlights({
  origin,
  destination,
  departureDate,
  returnDate,
  enabled = true,
}: Omit<FlightSearchParams, 'currency'>) {
  const { 
    data: flights, 
    isLoading,
    isError,
    error
  } = useRealFlightSearch({
    origin,
    destination,
    departureDate,
    returnDate,
    enabled,
  });

  return {
    flights: flights || [],
    isLoading,
    isError,
    error,
    hasRealPrices: false, // All prices are indicative
  };
}
