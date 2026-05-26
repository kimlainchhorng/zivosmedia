/**
 * Custom hooks for location search functionality
 */

import { useMemo, useCallback } from "react";
import { airports, searchAirports, getPopularAirports, type Airport } from "@/data/airports";
import { CITIES, searchCities, getPopularCities, type City } from "@/data/cities";
import type { LocationOption } from "../LocationAutocomplete";

/**
 * Convert Airport to LocationOption
 */
function airportToOption(airport: Airport): LocationOption {
  return {
    value: airport.code,
    label: `${airport.city} (${airport.code})`,
    secondary: airport.name,
    country: airport.country,
    region: airport.region,
    popularity: airport.popularity,
    type: 'airport',
  };
}

/**
 * Convert City to LocationOption
 */
function cityToOption(city: City): LocationOption {
  return {
    value: city.slug,
    label: city.name,
    secondary: city.region ? `${city.region}, ${city.country}` : city.country,
    country: city.country,
    popularity: city.popularity,
    type: 'city',
  };
}

/**
 * Hook for airport search (Flights & Cars)
 */
export function useAirportSearch() {
  const allOptions = useMemo(() => 
    airports.map(airportToOption),
    []
  );

  const search = useCallback((query: string, limit = 8): LocationOption[] => {
    const results = searchAirports(query);
    return results.slice(0, limit).map(airportToOption);
  }, []);

  const getPopular = useCallback((limit = 6): LocationOption[] => {
    return getPopularAirports(limit).map(airportToOption);
  }, []);

  const getByCode = useCallback((code: string): LocationOption | null => {
    const airport = airports.find(a => a.code.toUpperCase() === code.toUpperCase());
    return airport ? airportToOption(airport) : null;
  }, []);

  return {
    allOptions,
    search,
    getPopular,
    getByCode,
  };
}

/**
 * Hook for city search (Hotels)
 */
export function useCitySearch() {
  const allOptions = useMemo(() => 
    CITIES.map(cityToOption),
    []
  );

  const search = useCallback((query: string, limit = 8): LocationOption[] => {
    const results = searchCities(query, limit);
    return results.map(cityToOption);
  }, []);

  const getPopular = useCallback((limit = 6): LocationOption[] => {
    return getPopularCities(limit).map(cityToOption);
  }, []);

  const getBySlug = useCallback((slug: string): LocationOption | null => {
    const city = CITIES.find(c => c.slug.toLowerCase() === slug.toLowerCase());
    return city ? cityToOption(city) : null;
  }, []);

  return {
    allOptions,
    search,
    getPopular,
    getBySlug,
  };
}
