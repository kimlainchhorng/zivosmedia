/**
 * Multi-Provider Pricing Hook
 * Generates simulated alternative provider prices for MVP
 * Future: integrate TravelPayouts or other meta-search APIs
 */

import { useMemo } from "react";

export interface ProviderPrice {
  id: string;
  name: string;
  price: number;
  currency: string;
  isBestDeal: boolean;
  isOfficialPrice: boolean;
  discount?: number; // percentage discount from official
  partnerUrl?: string;
  features?: string[];
}

export interface MultiProviderResult {
  providers: ProviderPrice[];
  lowestPrice: number;
  officialPrice: number;
  savings: number;
  savingsPercent: number;
}

// Partner configuration
const FLIGHT_PARTNERS = [
  { id: "duffel", name: "Airline Direct", isOfficial: true },
  
  { id: "mytrip", name: "Mytrip", isOfficial: false },
  { id: "trip", name: "Trip.com", isOfficial: false },
];

const HOTEL_PARTNERS = [
  { id: "booking", name: "Booking.com", isOfficial: false },
  { id: "hotels", name: "Hotels.com", isOfficial: false },
  { id: "expedia", name: "Expedia", isOfficial: false },
  { id: "agoda", name: "Agoda", isOfficial: false },
];

const CAR_PARTNERS = [
  { id: "economybookings", name: "EconomyBookings", isOfficial: false },
  { id: "discovercars", name: "DiscoverCars", isOfficial: false },
  { id: "rentalcars", name: "Rentalcars.com", isOfficial: false },
  { id: "kayak", name: "KAYAK", isOfficial: false },
];

/**
 * Multi-provider pricing — returns empty until real partner APIs are integrated.
 * Hook into a meta-search provider (TravelPayouts, Skyscanner, etc.) when ready.
 */
export function useMultiProviderPricing(
  basePrice: number,
  currency: string,
  service: "flights" | "hotels" | "cars",
  itemId?: string
): MultiProviderResult {
  return useMemo(() => {
    // No simulated prices — return empty until real partner APIs are integrated
    return {
      providers: [],
      lowestPrice: 0,
      officialPrice: basePrice || 0,
      savings: 0,
      savingsPercent: 0,
    };
  }, [basePrice, currency, service, itemId]);
}

/**
 * Hook for batch multi-provider pricing (multiple items)
 */
export function useBatchMultiProviderPricing(
  items: Array<{ id: string; price: number; currency: string }>,
  service: "flights" | "hotels" | "cars"
): Map<string, MultiProviderResult> {
  return useMemo(() => {
    const resultsMap = new Map<string, MultiProviderResult>();
    
    items.forEach((item) => {
      if (!item.price || item.price <= 0) return;
      
      const partners = service === "flights" 
        ? FLIGHT_PARTNERS 
        : service === "hotels" 
          ? HOTEL_PARTNERS 
          : CAR_PARTNERS;

      const seed = hashCode(item.id);
      
      const providers: ProviderPrice[] = partners.map((partner, idx) => {
        if (partner.isOfficial) {
          return {
            id: partner.id,
            name: partner.name,
            price: item.price,
            currency: item.currency,
            isBestDeal: false,
            isOfficialPrice: true,
          };
        }

        const variance = seededRandom(seed + idx) * 0.25 - 0.15;
        const partnerPrice = Math.round(item.price * (1 + variance));
        
        return {
          id: partner.id,
          name: partner.name,
          price: partnerPrice,
          currency: item.currency,
          isBestDeal: false,
          isOfficialPrice: false,
          discount: variance < 0 ? Math.abs(Math.round(variance * 100)) : undefined,
        };
      });

      providers.sort((a, b) => a.price - b.price);
      if (providers.length > 0) {
        providers[0].isBestDeal = true;
      }

      const lowestPrice = providers[0]?.price || item.price;
      const savings = item.price - lowestPrice;

      resultsMap.set(item.id, {
        providers,
        lowestPrice,
        officialPrice: item.price,
        savings: Math.max(0, savings),
        savingsPercent: item.price > 0 ? Math.max(0, Math.round((savings / item.price) * 100)) : 0,
      });
    });

    return resultsMap;
  }, [items, service]);
}

// Helper: Simple hash function for deterministic randomness
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Helper: Seeded random number generator (0-1)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default useMultiProviderPricing;
