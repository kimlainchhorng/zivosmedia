/**
 * Real Car Rental Search Hook
 * Uses Travelpayouts car rental partners for affiliate redirect
 * 
 * Partners: EconomyBookings, QEEQ, GetRentACar
 */

import { useState, useCallback } from "react";
import { getAirportByCode } from "@/components/car/AirportAutocomplete";
import { TRAVELPAYOUTS_DIRECT_LINKS, CAR_PARTNERS } from "@/config/affiliateLinks";

export interface CarSearchParams {
  pickupCode: string;       // IATA code (e.g., "PNH")
  pickupLabel: string;      // Display name (e.g., "Phnom Penh International Airport")
  pickupDate: string;       // YYYY-MM-DD
  pickupTime: string;       // HH:mm
  dropoffDate: string;      // YYYY-MM-DD
  dropoffTime: string;      // HH:mm
  driverAge?: number;
}

export interface CarResult {
  id: string;
  category: string;
  categoryIcon: string;
  seats: number;
  bags: number;
  transmission: 'Automatic' | 'Manual';
  hasAC: boolean;
  mileage: string;
  fuelPolicy: string;
  pricePerDay: number;
  totalPrice: number;
  company: string;
  companyLogo: string;
  features: string[];
}

export interface CarSearchResponse {
  cars: CarResult[];
  isRealPrice: boolean;
  partnerUrls: {
    economybookings: string;
    qeeq: string;
    getrentacar: string;
  };
  message?: string;
  totalResults: number;
}

// Build partner URLs for car search
export function buildCarPartnerUrls(params: CarSearchParams) {
  // All partners use Travelpayouts direct links
  // Real prices will be shown on partner sites
  return {
    economybookings: TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings,
    qeeq: TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq,
    getrentacar: TRAVELPAYOUTS_DIRECT_LINKS.cars.getrentacar,
  };
}

// Get primary partner URL with search params
export function buildPrimaryCarUrl(params: CarSearchParams): string {
  // EconomyBookings is primary partner
  return TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings;
}

// Generate indicative car results for display
// These are NOT real prices - users will see real prices on partner site
function generateIndicativeCars(
  pickupCode: string,
  days: number,
  count: number = 8
): CarResult[] {
  const categories = [
    { category: "Economy", icon: "car", seats: 4, bags: 2, basePrice: 25, company: "Europcar" },
    { category: "Compact", icon: "car-front", seats: 5, bags: 2, basePrice: 30, company: "Hertz" },
    { category: "Midsize", icon: "car", seats: 5, bags: 3, basePrice: 38, company: "Avis" },
    { category: "Full-size", icon: "truck", seats: 5, bags: 4, basePrice: 45, company: "Budget" },
    { category: "SUV", icon: "car-front", seats: 7, bags: 4, basePrice: 55, company: "Enterprise" },
    { category: "Premium SUV", icon: "car-front", seats: 7, bags: 5, basePrice: 75, company: "National" },
    { category: "Luxury", icon: "crown", seats: 5, bags: 3, basePrice: 95, company: "Sixt" },
    { category: "Minivan", icon: "bus", seats: 8, bags: 6, basePrice: 65, company: "Alamo" },
  ];

  // Location multiplier (some airports are more expensive)
  const priceMultiplier: Record<string, number> = {
    'JFK': 1.5, 'LAX': 1.4, 'LHR': 1.6, 'CDG': 1.4, 'DXB': 1.3,
    'SIN': 1.2, 'HKG': 1.3, 'NRT': 1.4, 'SYD': 1.3,
    'BKK': 0.7, 'KTI': 0.5, 'SGN': 0.6, 'KUL': 0.8,
    'default': 1.0,
  };

  const multiplier = priceMultiplier[pickupCode] || priceMultiplier.default;

  return categories.slice(0, count).map((cat, i) => {
    const pricePerDay = Math.round(cat.basePrice * multiplier * (0.9 + Math.random() * 0.2));
    return {
      id: `car-${pickupCode}-${cat.category.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      category: cat.category,
      categoryIcon: cat.icon,
      seats: cat.seats,
      bags: cat.bags,
      transmission: 'Automatic' as const,
      hasAC: true,
      mileage: 'Unlimited',
      fuelPolicy: 'Full to Full',
      pricePerDay,
      totalPrice: pricePerDay * days,
      company: cat.company,
      companyLogo: cat.icon, // Placeholder
      features: ['Free cancellation', 'Theft protection', 'Collision damage waiver'].slice(0, Math.floor(Math.random() * 3) + 1),
    };
  });
}

/**
 * Hook for car rental search with partner redirect
 */
export function useRealCarSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CarResult[]>([]);
  const [searchParams, setSearchParams] = useState<CarSearchParams | null>(null);
  const [partnerUrls, setPartnerUrls] = useState<CarSearchResponse['partnerUrls'] | null>(null);
  const [isRealPrice, setIsRealPrice] = useState(false);

  const search = useCallback(async (params: CarSearchParams): Promise<CarSearchResponse> => {
    setIsLoading(true);
    setSearchParams(params);

    // Build partner URLs
    const urls = buildCarPartnerUrls(params);
    setPartnerUrls(urls);

    // Calculate rental days
    const pickupDate = new Date(params.pickupDate);
    const dropoffDate = new Date(params.dropoffDate);
    const days = Math.max(1, Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Simulate loading (real prices would come from API)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Generate indicative results for UI
    const indicativeCars = generateIndicativeCars(params.pickupCode, days, 8);
    
    setResults(indicativeCars);
    setIsRealPrice(false); // These are indicative, not real
    setIsLoading(false);

    return {
      cars: indicativeCars,
      isRealPrice: false,
      partnerUrls: urls,
      message: "Prices shown are indicative. View real-time prices on partner site.",
      totalResults: indicativeCars.length,
    };
  }, []);

  const getPartners = useCallback(() => {
    return CAR_PARTNERS.filter(p => p.isActive).sort((a, b) => b.priority - a.priority);
  }, []);

  return {
    isLoading,
    results,
    searchParams,
    partnerUrls,
    isRealPrice,
    search,
    getPartners,
  };
}
