/**
 * useGoogleMapsGeocode Hook
 * 
 * Provides address autocomplete suggestions using Google Places API via edge functions.
 * No mock fallbacks — production-only.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { getAutocompleteSuggestions } from "@/services/mapsApi";

export interface Suggestion {
  id: string;
  placeName: string;
  text: string;
  placeId?: string;
}

interface UseGoogleMapsGeocodeReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  fetchSuggestions: (query: string, proximity?: { lat: number; lng: number }) => void;
  clearSuggestions: () => void;
}

export function useGoogleMapsGeocode(): UseGoogleMapsGeocodeReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fetchSuggestions = useCallback((
    query: string,
    proximity?: { lat: number; lng: number }
  ) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Require minimum input
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce API calls
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);

      try {
        const results = await getAutocompleteSuggestions(query, proximity);
        
        setSuggestions(
          results.map((r) => ({
            id: r.place_id,
            placeName: r.description,
            text: r.main_text,
            placeId: r.place_id,
          }))
        );
      } catch (error) {
        console.error("Autocomplete error:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    fetchSuggestions,
    clearSuggestions,
  };
}
