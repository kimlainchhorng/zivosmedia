/**
 * Car Rental Partner Handoff Hook
 *
 * ZIVO does not currently receive live rental inventory or prices. This hook
 * keeps the search details and configured partner links ready without
 * manufacturing vehicles, providers, features, or prices in the app.
 */

import { useState, useCallback } from "react";
import {
  TRAVELPAYOUTS_DIRECT_LINKS,
  CAR_PARTNERS,
} from "@/config/affiliateLinks";

export interface CarSearchParams {
  pickupCode: string; // IATA code (e.g., "PNH")
  pickupLabel: string; // Display name (e.g., "Phnom Penh International Airport")
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm
  dropoffDate: string; // YYYY-MM-DD
  dropoffTime: string; // HH:mm
  driverAge?: number;
}

export interface CarResult {
  id: string;
  category: string;
  categoryIcon: string;
  seats: number;
  bags: number;
  transmission: "Automatic" | "Manual";
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
export function buildCarPartnerUrls(_params: CarSearchParams) {
  // All partners use Travelpayouts direct links
  // Real prices will be shown on partner sites
  return {
    economybookings: TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings,
    qeeq: TRAVELPAYOUTS_DIRECT_LINKS.cars.qeeq,
    getrentacar: TRAVELPAYOUTS_DIRECT_LINKS.cars.getrentacar,
  };
}

// Get primary partner URL with search params
export function buildPrimaryCarUrl(_params: CarSearchParams): string {
  // EconomyBookings is primary partner
  return TRAVELPAYOUTS_DIRECT_LINKS.cars.economybookings;
}

/**
 * Hook for preserving a rental search and handing it off to configured partners.
 */
export function useRealCarSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CarResult[]>([]);
  const [searchParams, setSearchParams] = useState<CarSearchParams | null>(
    null,
  );
  const [partnerUrls, setPartnerUrls] = useState<
    CarSearchResponse["partnerUrls"] | null
  >(null);
  const [isRealPrice, setIsRealPrice] = useState(false);

  const search = useCallback(
    async (params: CarSearchParams): Promise<CarSearchResponse> => {
      setIsLoading(true);
      setSearchParams(params);

      // Build partner URLs
      const urls = buildCarPartnerUrls(params);
      setPartnerUrls(urls);

      // No live inventory API is connected here. Keep the result set empty until
      // a provider-backed response is available instead of inventing results.
      setResults([]);
      setIsRealPrice(false);
      setIsLoading(false);

      return {
        cars: [],
        isRealPrice: false,
        partnerUrls: urls,
        message: "Live inventory and prices are available on partner sites.",
        totalResults: 0,
      };
    },
    [],
  );

  const getPartners = useCallback(() => {
    return CAR_PARTNERS.filter((p) => p.isActive).sort(
      (a, b) => b.priority - a.priority,
    );
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
