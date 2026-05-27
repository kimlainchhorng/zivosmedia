import { useState, useEffect } from 'react';

/**
 * AFFILIATE-ONLY MODEL:
 * This hook provides indicative trending route prices for display.
 * Real prices are available on partner sites after redirect.
 * NO external API calls are made - all prices are estimates.
 */

interface TrendingRoute {
  origin: string;
  destination: string;
  city: string;
  country: string;
  image: string;
}

interface TrendingDestination {
  city: string;
  country: string;
  code: string;
  price: number;
  originalPrice: number;
  image: string;
  trending: boolean;
  isLoading: boolean;
  isRealPrice: false; // Always false - indicative only
}

// Popular routes with indicative pricing
const TRENDING_ROUTES: TrendingRoute[] = [
  { origin: 'JFK', destination: 'LAX', city: 'Los Angeles', country: 'USA', image: 'LAX' },
  { origin: 'JFK', destination: 'LHR', city: 'London', country: 'UK', image: 'LHR' },
  { origin: 'LAX', destination: 'NRT', city: 'Tokyo', country: 'Japan', image: 'NRT' },
  { origin: 'JFK', destination: 'CDG', city: 'Paris', country: 'France', image: 'CDG' },
  { origin: 'LAX', destination: 'DXB', city: 'Dubai', country: 'UAE', image: 'DXB' },
  { origin: 'SFO', destination: 'SIN', city: 'Singapore', country: 'Singapore', image: 'SIN' },
  { origin: 'MIA', destination: 'CUN', city: 'Cancun', country: 'Mexico', image: 'CUN' },
  { origin: 'ORD', destination: 'BCN', city: 'Barcelona', country: 'Spain', image: 'BCN' },
  { origin: 'SEA', destination: 'HNL', city: 'Honolulu', country: 'USA', image: 'HNL' },
  { origin: 'BOS', destination: 'DUB', city: 'Dublin', country: 'Ireland', image: 'DUB' },
  { origin: 'DFW', destination: 'LAS', city: 'Las Vegas', country: 'USA', image: 'LAS' },
  { origin: 'ATL', destination: 'MBJ', city: 'Montego Bay', country: 'Jamaica', image: 'MBJ' },
];

// Indicative prices (display estimates only)
const INDICATIVE_PRICES: Record<string, number> = {
  'JFK-LAX': 129,
  'JFK-LHR': 349,
  'LAX-NRT': 599,
  'JFK-CDG': 399,
  'LAX-DXB': 549,
  'SFO-SIN': 699,
  'MIA-CUN': 149,
  'ORD-BCN': 429,
  'SEA-HNL': 249,
  'BOS-DUB': 329,
  'DFW-LAS': 79,
  'ATL-MBJ': 199,
};

export function useTrendingDestinations() {
  const [isLoading, setIsLoading] = useState(true);
  const [destinations, setDestinations] = useState<TrendingDestination[]>([]);

  useEffect(() => {
    // Simulate brief loading for UX consistency
    const timer = setTimeout(() => {
      const results = TRENDING_ROUTES.map((route, index) => {
        const basePrice = INDICATIVE_PRICES[`${route.origin}-${route.destination}`] || 299;
        // Add small variation for visual variety
        const variation = Math.round(basePrice * (0.95 + Math.random() * 0.1));
        
        return {
          city: route.city,
          country: route.country,
          code: route.destination,
          price: variation,
          originalPrice: Math.round(variation * 1.3),
          image: route.image,
          trending: index < 6,
          isLoading: false,
          isRealPrice: false as const, // Indicative pricing only
        };
      });
      
      setDestinations(results);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return {
    destinations,
    isLoading,
    hasRealPrices: false, // All prices are indicative
    disclaimer: 'Prices are indicative and may change. Final price shown on partner site.',
  };
}

// Hook to get indicative price for a specific route
export function useRoutePrice(origin: string, destination: string, enabled = true) {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !origin || !destination) {
      setIsLoading(false);
      return;
    }

    // Get indicative price (no API call)
    const key = `${origin}-${destination}`;
    const indicativePrice = INDICATIVE_PRICES[key];
    
    setPrice(indicativePrice || getEstimatedPrice(origin, destination));
    setIsLoading(false);
  }, [origin, destination, enabled]);

  return {
    data: price,
    isLoading,
    isError: false,
    isRealPrice: false,
  };
}

// Estimate price based on route characteristics
function getEstimatedPrice(origin: string, destination: string): number {
  // Domestic US
  const usCodes = ['JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'DEN', 'SFO', 'SEA', 'MIA', 'BOS', 'PHX', 'LAS'];
  const euCodes = ['LHR', 'CDG', 'FRA', 'AMS', 'MAD', 'FCO', 'BCN', 'DUB', 'MUC'];
  const asiaCodes = ['NRT', 'HND', 'HKG', 'SIN', 'ICN', 'BKK', 'TPE'];
  
  const isDomestic = usCodes.includes(origin) && usCodes.includes(destination);
  const isTransatlantic = (usCodes.includes(origin) && euCodes.includes(destination)) ||
                          (euCodes.includes(origin) && usCodes.includes(destination));
  const isTranspacific = (usCodes.includes(origin) && asiaCodes.includes(destination)) ||
                          (asiaCodes.includes(origin) && usCodes.includes(destination));
  
  if (isDomestic) return 99 + Math.floor(Math.random() * 100);
  if (isTransatlantic) return 299 + Math.floor(Math.random() * 200);
  if (isTranspacific) return 499 + Math.floor(Math.random() * 300);
  
  return 199 + Math.floor(Math.random() * 200);
}

// Hook to get popular routes from any origin
export function usePopularRoutesFromOrigin(origin: string) {
  const popularDestinations = ['LAX', 'LHR', 'NRT', 'CDG', 'DXB', 'SIN', 'CUN', 'BCN'];
  const [routes, setRoutes] = useState<Array<{ destination: string; price: number; isLoading: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!origin) {
      setIsLoading(false);
      return;
    }

    const results = popularDestinations
      .filter(dest => dest !== origin)
      .slice(0, 6)
      .map(destination => ({
        destination,
        price: INDICATIVE_PRICES[`${origin}-${destination}`] || getEstimatedPrice(origin, destination),
        isLoading: false,
      }));
    
    setRoutes(results);
    setIsLoading(false);
  }, [origin]);

  return {
    routes,
    isLoading,
  };
}
