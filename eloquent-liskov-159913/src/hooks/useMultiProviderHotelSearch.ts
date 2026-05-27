/**
 * Multi-Provider Hotel Search Hook
 * Fetches from Hotelbeds and RateHawk in parallel
 * Normalizes, merges, and compares prices across suppliers
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ZivoPropertyExtended, ZivoPropertySearchResult } from "@/types/zivoProperty";
import type { PropertySource } from "@/types/zivoProperty";
import {
  normalizeHotelbedsToZivoProperty,
  normalizeRateHawkToZivoProperty,
  mergeMultiSourceProperties,
} from "@/services/propertyNormalizer";
import type { HotelbedsHotel } from "@/types/hotelbeds";
import type { RateHawkHotel } from "@/types/ratehawk";
import { differenceInDays } from "date-fns";

export interface MultiProviderSearchParams {
  citySlug: string;
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  children?: number;
  childAges?: number[];
}

export interface MultiProviderFilters {
  priceRange?: [number, number];
  starRating?: number[];
  guestRating?: number | null;
  amenities?: string[];
  payAtHotelOnly?: boolean;
  freeCancellation?: boolean;
  sources?: PropertySource[];
}

interface SupplierResult {
  supplier: PropertySource;
  properties: ZivoPropertyExtended[];
  responseTimeMs: number;
  error?: string;
}

export function useMultiProviderHotelSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ZivoPropertyExtended[]>([]);
  const [searchResult, setSearchResult] = useState<ZivoPropertySearchResult | null>(null);
  const [searchParams, setSearchParams] = useState<MultiProviderSearchParams | null>(null);

  /**
   * Fetch hotels from Hotelbeds
   */
  const fetchHotelbeds = async (
    params: MultiProviderSearchParams,
    nights: number
  ): Promise<SupplierResult> => {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("hotelbeds-hotels", {
        body: {
          action: "search",
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          destination: params.citySlug.toUpperCase(),
          rooms: params.rooms,
          adults: params.adults,
          children: params.children || 0,
          childAges: params.childAges || [],
        },
      });

      const responseTimeMs = Date.now() - startTime;

      if (error) {
        console.error("Hotelbeds search error:", error);
        return { supplier: "HOTELBEDS", properties: [], responseTimeMs, error: error.message };
      }

      const hotels: HotelbedsHotel[] = data?.data?.hotels || [];
      const properties = hotels.map(hotel => normalizeHotelbedsToZivoProperty(hotel, nights));

      return { supplier: "HOTELBEDS", properties, responseTimeMs };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      console.error("Hotelbeds fetch error:", error);
      return { 
        supplier: "HOTELBEDS", 
        properties: [], 
        responseTimeMs, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  };

  /**
   * Fetch hotels from RateHawk
   */
  const fetchRateHawk = async (
    params: MultiProviderSearchParams,
    nights: number
  ): Promise<SupplierResult> => {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("ratehawk-hotels", {
        body: {
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          destination: params.cityName,
          rooms: params.rooms,
          adults: params.adults,
          children: params.children || 0,
          childAges: params.childAges || [],
        },
      });

      const responseTimeMs = Date.now() - startTime;

      if (error) {
        console.error("RateHawk search error:", error);
        return { supplier: "RATEHAWK", properties: [], responseTimeMs, error: error.message };
      }

      const hotels: RateHawkHotel[] = data?.data || [];
      const properties = hotels.map(hotel => normalizeRateHawkToZivoProperty(hotel, nights));

      return { supplier: "RATEHAWK", properties, responseTimeMs };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      console.error("RateHawk fetch error:", error);
      return { 
        supplier: "RATEHAWK", 
        properties: [], 
        responseTimeMs, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  };

  /**
   * Apply filters to properties
   */
  const applyFilters = useCallback((
    properties: ZivoPropertyExtended[],
    filters: MultiProviderFilters
  ): ZivoPropertyExtended[] => {
    return properties.filter(property => {
      // Price range filter
      if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        if (property.pricePerNight < min || property.pricePerNight > max) {
          return false;
        }
      }

      // Star rating filter
      if (filters.starRating && filters.starRating.length > 0) {
        if (!filters.starRating.includes(property.meta.starRating)) {
          return false;
        }
      }

      // Guest rating filter
      if (filters.guestRating && property.reviewScore) {
        if (property.reviewScore < filters.guestRating) {
          return false;
        }
      }

      // Pay at hotel filter
      if (filters.payAtHotelOnly && property.pricing.type !== "PAY_AT_HOTEL") {
        return false;
      }

      // Free cancellation filter
      if (filters.freeCancellation && !property.hasFreeCancellation) {
        return false;
      }

      // Source filter
      if (filters.sources && filters.sources.length > 0) {
        if (!filters.sources.includes(property.source)) {
          return false;
        }
      }

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        const propertyFacilities = property.facilities.map(f => f.toLowerCase());
        const hasAllAmenities = filters.amenities.every(a => 
          propertyFacilities.some(f => f.includes(a.toLowerCase()))
        );
        if (!hasAllAmenities) return false;
      }

      return true;
    });
  }, []);

  /**
   * Main search function
   */
  const search = useCallback(async (
    params: MultiProviderSearchParams,
    filters?: MultiProviderFilters
  ) => {
    setIsLoading(true);
    setSearchParams(params);

    const nights = differenceInDays(new Date(params.checkOut), new Date(params.checkIn));

    try {
      // Fetch from all suppliers in parallel
      const [hotelbedsResult, ratehawkResult] = await Promise.all([
        fetchHotelbeds(params, nights),
        fetchRateHawk(params, nights),
      ]);

      // Merge and compare prices
      const mergedProperties = mergeMultiSourceProperties(
        hotelbedsResult.properties,
        ratehawkResult.properties
      );

      // Apply filters if provided
      const filteredProperties = filters 
        ? applyFilters(mergedProperties, filters)
        : mergedProperties;

      // Sort by price by default
      filteredProperties.sort((a, b) => a.pricing.amount - b.pricing.amount);

      // Calculate price range
      const prices = filteredProperties.map(p => p.pricePerNight);
      const priceRange = {
        min: Math.min(...prices, 0),
        max: Math.max(...prices, 1000),
        currency: "USD",
      };

      // Calculate match stats
      const matchedCount = filteredProperties.filter(p => p.alternativeRates?.length).length;

      const result: ZivoPropertySearchResult = {
        properties: filteredProperties,
        total: filteredProperties.length,
        searchId: crypto.randomUUID(),
        searchParams: {
          destination: params.cityName,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          rooms: params.rooms,
          adults: params.adults,
          children: params.children,
        },
        timestamp: new Date().toISOString(),
        supplierResults: [
          {
            supplier: "HOTELBEDS",
            count: hotelbedsResult.properties.length,
            responseTimeMs: hotelbedsResult.responseTimeMs,
            error: hotelbedsResult.error,
          },
          {
            supplier: "RATEHAWK",
            count: ratehawkResult.properties.length,
            responseTimeMs: ratehawkResult.responseTimeMs,
            error: ratehawkResult.error,
          },
        ],
        priceRange,
        matchStats: {
          totalProperties: mergedProperties.length,
          matchedAcrossSuppliers: matchedCount,
          uniqueHotelbeds: hotelbedsResult.properties.length - matchedCount / 2,
          uniqueRatehawk: ratehawkResult.properties.length - matchedCount / 2,
        },
      };

      setResults(filteredProperties);
      setSearchResult(result);

    } catch (error) {
      console.error("Multi-provider search error:", error);
      setResults([]);
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyFilters]);

  /**
   * Re-apply filters without fetching
   */
  const filterResults = useCallback((filters: MultiProviderFilters) => {
    if (!searchResult) return;
    
    const filteredProperties = applyFilters(searchResult.properties, filters);
    filteredProperties.sort((a, b) => a.pricing.amount - b.pricing.amount);
    setResults(filteredProperties);
  }, [searchResult, applyFilters]);

  return {
    isLoading,
    results,
    searchResult,
    searchParams,
    search,
    filterResults,
  };
}
