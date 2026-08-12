import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TripadvisorLocation {
  location_id: string;
  name: string;
  description?: string;
  web_url?: string;
  address_obj: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    address_string?: string;
  };
  latitude?: string;
  longitude?: string;
  rating?: string;
  rating_image_url?: string;
  num_reviews?: string;
  price_level?: string;
  amenities?: string[];
  category?: {
    name: string;
    localized_name: string;
  };
  photos?: Array<{
    id: string;
    images: {
      thumbnail: { url: string; width: number; height: number };
      small: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      large: { url: string; width: number; height: number };
      original: { url: string; width: number; height: number };
    };
    album: string;
    caption?: string;
  }>;
  awards?: Array<{
    award_type: string;
    year: string;
    display_name: string;
    images: {
      small: string;
      large: string;
    };
  }>;
}

interface SearchResult {
  success: boolean;
  data?: TripadvisorLocation[];
  error?: string;
  meta?: {
    query: string;
    category: string;
    total: number;
  };
}

type TripadvisorCategory = "hotels" | "restaurants" | "attractions";

interface TripadvisorSearchOptions {
  latLong?: string;
  language?: string;
  currency?: string;
}

export const useTripadvisorSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TripadvisorLocation[]>([]);
  const searchRequestRef = useRef(0);

  const search = useCallback(async (
    query: string,
    category: TripadvisorCategory,
    options?: TripadvisorSearchOptions,
  ): Promise<TripadvisorLocation[]> => {
    const request = ++searchRequestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SearchResult>(
        "search-hotels",
        {
          body: {
            query,
            category,
            ...options,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Search failed");
      }

      const locations = data.data || [];
      if (request === searchRequestRef.current) {
        setResults(locations);
      }
      return locations;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      if (request === searchRequestRef.current) {
        setError(message);
        setResults([]);
      }
      return [];
    } finally {
      if (request === searchRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const searchHotels = useCallback((
    query: string,
    options?: TripadvisorSearchOptions,
  ) => search(query, "hotels", options), [search]);

  const searchRestaurants = useCallback((
    query: string,
    options?: TripadvisorSearchOptions,
  ) => search(query, "restaurants", options), [search]);

  const searchAttractions = useCallback((
    query: string,
    options?: TripadvisorSearchOptions,
  ) => search(query, "attractions", options), [search]);

  const clearResults = useCallback(() => {
    searchRequestRef.current += 1;
    setIsLoading(false);
    setResults([]);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    results,
    searchHotels,
    searchRestaurants,
    searchAttractions,
    clearResults,
  };
};

export type { TripadvisorLocation };
