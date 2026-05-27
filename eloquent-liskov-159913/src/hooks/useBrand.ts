/**
 * useBrand Hook
 * Lightweight access to brand configuration
 */
import { useContext } from "react";
import { BrandContext, DEFAULT_BRAND } from "@/contexts/BrandContext";
import type { BrandContextValue } from "@/contexts/BrandContext";

export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  
  if (!context) {
    // Return default ZIVO brand if outside provider
    return {
      brand: DEFAULT_BRAND,
      isLoading: false,
      isCustomBrand: false,
    };
  }
  
  return context;
}
