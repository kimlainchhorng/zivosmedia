 /**
  * ZIVO Hotel Normalization Logic
  * Deduplicates & compares results from multiple suppliers (Hotelbeds, RateHawk)
  * Creates unified list with price comparison metadata
  */
 
 import type { NormalizedHotel } from "@/types/hotels";
 import type { PropertySource } from "@/types/zivoProperty";
 
 export interface UnifiedHotel extends NormalizedHotel {
   /** Secondary price from alternate supplier (if matched) */
   secondaryPrice: number | null;
   /** Fallback supplier code when primary is cheaper */
   fallbackSupplier?: PropertySource;
   /** Price savings vs secondary supplier */
   savings?: number;
   /** Savings as percentage */
   savingsPercent?: number;
 }
 
 /**
  * Generate unique key for hotel matching
  * Based on sanitized name + coordinates (3 decimal precision ~111m)
  */
 const generateMatchKey = (hotel: NormalizedHotel): string => {
   const sanitizedName = hotel.name
     .toLowerCase()
     .replace(/[^a-z0-9]/g, "")
     .slice(0, 30);
   
   const lat = hotel.latitude?.toFixed(3) ?? "0";
   const lng = hotel.longitude?.toFixed(3) ?? "0";
   
   return `${sanitizedName}-${lat}-${lng}`;
 };
 
 /**
  * Normalize and deduplicate hotel results from multiple suppliers
  * Keeps best price as primary, tracks secondary for comparison
  */
 export const normalizeHotels = (
   hbResults: NormalizedHotel[],
   rhResults: NormalizedHotel[]
 ): UnifiedHotel[] => {
   const unifiedList = new Map<string, UnifiedHotel>();
 
   // Process all hotels from both suppliers
   [...hbResults, ...rhResults].forEach((hotel) => {
     const key = generateMatchKey(hotel);
 
     if (unifiedList.has(key)) {
       const existing = unifiedList.get(key)!;
 
       // If new hotel is cheaper, swap primary/secondary
       if (hotel.minPrice < existing.minPrice) {
         const savings = existing.minPrice - hotel.minPrice;
         unifiedList.set(key, {
           ...hotel,
           secondaryPrice: existing.minPrice,
           fallbackSupplier: existing.supplierCode as PropertySource,
           savings,
           savingsPercent: Math.round((savings / existing.minPrice) * 100),
         });
       } else {
         // Keep existing, update secondary
         existing.secondaryPrice = hotel.minPrice;
         existing.savings = hotel.minPrice - existing.minPrice;
         existing.savingsPercent = Math.round(
           (existing.savings / hotel.minPrice) * 100
         );
       }
     } else {
       // First occurrence - no match yet
       unifiedList.set(key, {
         ...hotel,
         secondaryPrice: null,
       });
     }
   });
 
   return Array.from(unifiedList.values());
 };
 
 /**
  * Sort unified hotels by various criteria
  */
 export const sortUnifiedHotels = (
   hotels: UnifiedHotel[],
   sortBy: "price" | "savings" | "rating" | "name" = "price"
 ): UnifiedHotel[] => {
   return [...hotels].sort((a, b) => {
     switch (sortBy) {
       case "price":
         return a.minPrice - b.minPrice;
       case "savings":
         return (b.savings ?? 0) - (a.savings ?? 0);
       case "rating":
         return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
       case "name":
         return a.name.localeCompare(b.name);
       default:
         return 0;
     }
   });
 };
 
 /**
  * Get match statistics for analytics
  */
 export const getMatchStats = (hotels: UnifiedHotel[]) => {
   const matched = hotels.filter((h) => h.secondaryPrice !== null);
   const avgSavings = matched.length
     ? matched.reduce((sum, h) => sum + (h.savings ?? 0), 0) / matched.length
     : 0;
 
   return {
     total: hotels.length,
     matchedCount: matched.length,
     matchRate: Math.round((matched.length / hotels.length) * 100),
     avgSavings: Math.round(avgSavings),
     maxSavings: Math.max(...hotels.map((h) => h.savings ?? 0)),
   };
 };