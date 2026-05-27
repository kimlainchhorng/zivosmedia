/**
 * Brand Context
 * Domain-based brand detection and configuration provider
 */
import { createContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandConfig {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  domain: string | null;
}

export interface BrandContextValue {
  brand: BrandConfig;
  isLoading: boolean;
  isCustomBrand: boolean;
}

export const DEFAULT_BRAND: BrandConfig = {
  id: "default",
  name: "ZIVO",
  logoUrl: null,
  primaryColor: null,
  domain: null,
};

export const BrandContext = createContext<BrandContextValue | null>(null);

// Persisted across tabs/relaunches so the brand renders instantly on cold start.
const BRAND_CACHE_KEY = "zivo_brand_config";

function getCachedBrand(): BrandConfig | null {
  try {
    const cached = localStorage.getItem(BRAND_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setCachedBrand(brand: BrandConfig) {
  try {
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(brand));
  } catch {
    // Ignore storage errors
  }
}

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  
  // Check cache for instant load
  const cachedBrand = useMemo(() => getCachedBrand(), []);

  const { data: fetchedBrand, isLoading } = useQuery({
    queryKey: ["brand-config", hostname],
    queryFn: async (): Promise<BrandConfig> => {
      // Skip query for localhost/preview domains - use default
      if (
        hostname === "localhost" ||
        hostname.includes("lovable.app") ||
        hostname.includes("127.0.0.1")
      ) {
        return DEFAULT_BRAND;
      }

      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url, primary_color, domain")
        .eq("domain", hostname)
        .maybeSingle();

      if (error) {
        console.error("Error fetching brand config:", error);
        return DEFAULT_BRAND;
      }

      if (!data) {
        return DEFAULT_BRAND;
      }

      return {
        id: data.id,
        name: data.name || "ZIVO",
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        domain: data.domain,
      };
    },
    // Brand config changes are rare — 24h stale window keeps the network call
    // off the critical path on cold boots without going stale in practice.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: cachedBrand ?? undefined,
  });

  // Use cached brand while loading, then fetched brand
  const brand = fetchedBrand ?? cachedBrand ?? DEFAULT_BRAND;

  // Cache the fetched brand
  useEffect(() => {
    if (fetchedBrand && fetchedBrand.id !== "default") {
      setCachedBrand(fetchedBrand);
    }
  }, [fetchedBrand]);

  const value = useMemo(
    () => ({
      brand,
      isLoading: isLoading && !cachedBrand,
      isCustomBrand: brand.id !== "default",
    }),
    [brand, isLoading, cachedBrand]
  );

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}
