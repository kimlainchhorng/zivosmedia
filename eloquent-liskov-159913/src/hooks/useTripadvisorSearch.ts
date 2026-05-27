import { useState } from "react";
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

export const useTripadvisorSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TripadvisorLocation[]>([]);

  const searchHotels = async (
    query: string,
    options?: {
      latLong?: string;
      language?: string;
      currency?: string;
    }
  ): Promise<TripadvisorLocation[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SearchResult>(
        "search-hotels",
        {
          body: {
            query,
            category: "hotels",
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
      setResults(locations);
      return locations;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      setResults([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const searchRestaurants = async (
    query: string,
    options?: {
      latLong?: string;
      language?: string;
      currency?: string;
    }
  ): Promise<TripadvisorLocation[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SearchResult>(
        "search-hotels",
        {
          body: {
            query,
            category: "restaurants",
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
      setResults(locations);
      return locations;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      setResults([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const searchAttractions = async (
    query: string,
    options?: {
      latLong?: string;
      language?: string;
      currency?: string;
    }
  ): Promise<TripadvisorLocation[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<SearchResult>(
        "search-hotels",
        {
          body: {
            query,
            category: "attractions",
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
      setResults(locations);
      return locations;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      setResults([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

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
