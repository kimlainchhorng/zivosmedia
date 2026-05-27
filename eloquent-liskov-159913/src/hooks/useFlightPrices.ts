import { useQuery } from "@tanstack/react-query";

/**
 * AFFILIATE-ONLY MODEL:
 * This hook provides indicative pricing estimates for display purposes only.
 * Real prices are shown on partner sites after redirect.
 * NO external API calls are made.
 */

interface IndicativePrice {
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  returnAt?: string;
  duration: number;
  transfers: number;
  origin: string;
  destination: string;
  link: string;
}

interface FlightPricesResponse {
  success: boolean;
  prices: IndicativePrice[];
  currency: string;
  origin: string;
  destination: string;
  isIndicative: boolean; // Always true - no real API prices
}

interface UseFlightPricesParams {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  currency?: string;
  enabled?: boolean;
}

// Route-based indicative pricing estimates
const getIndicativePriceRange = (origin: string, destination: string): { min: number; max: number } => {
  // Domestic US routes
  const domesticPairs = [
    ['JFK', 'LAX'], ['LAX', 'SFO'], ['ORD', 'MIA'], ['DFW', 'LAS'],
    ['ATL', 'BOS'], ['SEA', 'PHX'], ['DEN', 'MSP']
  ];
  
  const isTransatlantic = (
    (['JFK', 'LAX', 'ORD', 'MIA', 'BOS', 'SFO'].includes(origin) && ['LHR', 'CDG', 'FRA', 'AMS', 'MAD', 'FCO'].includes(destination)) ||
    (['LHR', 'CDG', 'FRA', 'AMS', 'MAD', 'FCO'].includes(origin) && ['JFK', 'LAX', 'ORD', 'MIA', 'BOS', 'SFO'].includes(destination))
  );
  
  const isTranspacific = (
    (['LAX', 'SFO', 'SEA', 'JFK'].includes(origin) && ['NRT', 'HND', 'HKG', 'ICN', 'SIN', 'BKK'].includes(destination)) ||
    (['NRT', 'HND', 'HKG', 'ICN', 'SIN', 'BKK'].includes(origin) && ['LAX', 'SFO', 'SEA', 'JFK'].includes(destination))
  );
  
  const isDomestic = domesticPairs.some(
    ([a, b]) => (origin === a && destination === b) || (origin === b && destination === a)
  );
  
  if (isDomestic) return { min: 79, max: 249 };
  if (isTransatlantic) return { min: 299, max: 849 };
  if (isTranspacific) return { min: 449, max: 1199 };
  
  // Default international
  return { min: 199, max: 699 };
};

// Generate indicative prices for calendar/date displays
const generateIndicativePrices = (
  origin: string,
  destination: string,
  departureDate?: string
): IndicativePrice[] => {
  const { min, max } = getIndicativePriceRange(origin, destination);
  const prices: IndicativePrice[] = [];
  
  // Generate 5-7 indicative price points
  const numPrices = 5 + Math.floor(Math.random() * 3);
  const airlines = ['AA', 'DL', 'UA', 'BA', 'AF', 'LH', 'B6'];
  
  for (let i = 0; i < numPrices; i++) {
    const price = min + Math.round((max - min) * (i / numPrices) * (0.8 + Math.random() * 0.4));
    const airline = airlines[i % airlines.length];
    
    prices.push({
      price,
      airline,
      flightNumber: `${airline}${1000 + i * 100}`,
      departureAt: departureDate || new Date().toISOString().split('T')[0],
      duration: 180 + i * 30,
      transfers: i < 3 ? 0 : 1,
      origin,
      destination,
      link: '', // Affiliate redirect will generate the actual link
    });
  }
  
  return prices.sort((a, b) => a.price - b.price);
};

export function useFlightPrices({
  origin,
  destination,
  departureDate,
  returnDate,
  currency = 'USD',
  enabled = true,
}: UseFlightPricesParams) {
  return useQuery({
    queryKey: ['indicative-prices', origin, destination, departureDate, returnDate, currency],
    queryFn: async (): Promise<FlightPricesResponse> => {
      // Generate indicative prices locally (no API calls)
      const prices = generateIndicativePrices(origin, destination, departureDate);
      
      return {
        success: true,
        prices,
        currency,
        origin,
        destination,
        isIndicative: true, // Flag that these are estimates only
      };
    },
    enabled: enabled && !!origin && !!destination && origin.length === 3 && destination.length === 3,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Helper to get the lowest indicative price for a specific date
export function getLowestPriceForDate(prices: IndicativePrice[], date: string): number | null {
  const dateStr = date.split('T')[0];
  const matchingPrices = prices.filter(p => p.departureAt.startsWith(dateStr));
  if (matchingPrices.length === 0) return null;
  return Math.min(...matchingPrices.map(p => p.price));
}

// Helper to get indicative price range for the month
export function getPriceRangeForMonth(prices: IndicativePrice[]): { min: number; max: number } | null {
  if (prices.length === 0) return null;
  const allPrices = prices.map(p => p.price);
  return {
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
  };
}
