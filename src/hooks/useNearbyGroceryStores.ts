/**
 * useNearbyGroceryStores - Find real store locations near customer's delivery address
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StoreName } from "@/config/groceryStores";

export interface NearbyStoreLocation {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_miles: number | null;
  rating: number | null;
  open_now: boolean | null;
  slug: string;
  storeName: StoreName;
}

const SLUG_TO_STORE: Record<string, StoreName> = {
  walmart: "Walmart",
  costco: "Costco",
  target: "Target",
  kroger: "Kroger",
};

const MAX_RADIUS_MILES = 15;

export function useNearbyGroceryStores() {
  const [stores, setStores] = useState<NearbyStoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchNearbyStores = useCallback(async (lat: number, lng: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("grocery-nearby-stores", {
        body: { lat, lng, radius_miles: MAX_RADIUS_MILES },
      });

      if (fnError) throw new Error(fnError.message || "Failed to find nearby stores");

      if (!data?.ok || !data?.stores) {
        throw new Error("Invalid response from store locator");
      }

      const allStores: NearbyStoreLocation[] = [];

      for (const [slug, locations] of Object.entries(data.stores as Record<string, any[]>)) {
        const storeName = SLUG_TO_STORE[slug];
        if (!storeName) continue;

        for (const loc of locations) {
          // Only include stores within radius
          if (loc.distance_miles != null && loc.distance_miles <= MAX_RADIUS_MILES) {
            allStores.push({
              ...loc,
              slug,
              storeName,
            });
          }
        }
      }

      // Sort by distance
      allStores.sort((a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99));

      if (requestId !== requestIdRef.current) return [];

      setStores(allStores);
      return allStores;
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return [];

      console.error("[useNearbyGroceryStores]", err);
      setError(err.message || "Failed to find stores");
      setStores([]);
      return [];
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return {
    stores,
    isLoading,
    error,
    fetchNearbyStores,
    maxRadius: MAX_RADIUS_MILES,
  };
}
