 /**
  * ZIVO Smart-Merge Logic
  * Enhanced hotel deduplication with "Shadow Fallback" for 99.9% booking success
  * Merges results from Hotelbeds and RateHawk, keeping best price as primary
  */
 
 import type { NormalizedHotel } from "@/types/hotels";
 import type { PropertySource } from "@/types/zivoProperty";
 
 export interface SmartMergedHotel extends NormalizedHotel {
   /** Unique ZIVO master ID (ZVO-<supplier>-<id>) */
   zivoMasterId: string;
   /** Primary rate (best price) */
   primaryRate: number;
   /** Fallback rate from alternate supplier */
   fallbackRate: number | null;
   /** Which supplier has priority */
   supplierPriority: PropertySource;
   /** Fallback supplier if primary fails */
   fallbackSupplier: PropertySource | null;
   /** Inventory source flag */
   inventorySource: "AGGREGATED_ZIVO_FEED" | "SINGLE_SUPPLIER";
   /** Match confidence score (0-1) */
   matchScore: number;
   /** Price savings vs secondary */
   savings?: number;
   /** Savings as percentage */
   savingsPercent?: number;
 }
 
 interface MatchableHotel extends NormalizedHotel {
   phone?: string;
   postalCode?: string;
 }
 
 /**
  * Normalize hotel name for matching
  * Removes common suffixes, articles, and punctuation
  */
 const normalizeName = (name: string): string => {
   return name
     .toLowerCase()
     .replace(/\b(hotel|resort|inn|suites?|lodge|motel|hostel)\b/gi, "")
     .replace(/\b(the|a|an|and|&)\b/gi, "")
     .replace(/[^a-z0-9]/g, "")
     .slice(0, 40);
 };
 
 /**
  * Normalize address for matching
  */
 const normalizeAddress = (address: string): string => {
   return address
     .toLowerCase()
     .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/gi, "")
     .replace(/[^a-z0-9]/g, "");
 };
 
 /**
  * Calculate distance between two coordinates (Haversine formula)
  * Returns distance in km
  */
 const geoDistance = (
   lat1: number | undefined,
   lng1: number | undefined,
   lat2: number | undefined,
   lng2: number | undefined
 ): number => {
   if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
   
   const R = 6371; // Earth's radius in km
   const dLat = ((lat2 - lat1) * Math.PI) / 180;
   const dLng = ((lng2 - lng1) * Math.PI) / 180;
   const a =
     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
     Math.cos((lat1 * Math.PI) / 180) *
       Math.cos((lat2 * Math.PI) / 180) *
       Math.sin(dLng / 2) *
       Math.sin(dLng / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
   return R * c;
 };
 
 /**
  * Generate match score between two hotels
  * Priority 1: Phone number match (1.0)
  * Priority 2: Postal code + address (0.8)
  * Priority 3: Name + geo proximity (0.6)
  */
 const generateMatchScore = (
   hotelA: MatchableHotel,
   hotelB: MatchableHotel
 ): number => {
   // Priority 1: Exact phone match
   if (hotelA.phone && hotelB.phone) {
     const phoneA = hotelA.phone.replace(/\D/g, "");
     const phoneB = hotelB.phone.replace(/\D/g, "");
     if (phoneA === phoneB && phoneA.length >= 7) {
       return 1.0;
     }
   }
 
   // Priority 2: Postal code + normalized address
   if (hotelA.postalCode && hotelB.postalCode) {
     if (hotelA.postalCode === hotelB.postalCode) {
       if (hotelA.address && hotelB.address) {
         const addrA = normalizeAddress(hotelA.address);
         const addrB = normalizeAddress(hotelB.address);
         if (addrA === addrB || addrA.includes(addrB) || addrB.includes(addrA)) {
           return 0.85;
         }
       }
       // Same postal code alone is moderate confidence
       return 0.7;
     }
   }
 
   // Priority 3: Normalized name + geo proximity
   const nameA = normalizeName(hotelA.name);
   const nameB = normalizeName(hotelB.name);
   const distance = geoDistance(
     hotelA.latitude,
     hotelA.longitude,
     hotelB.latitude,
     hotelB.longitude
   );
 
   if (nameA === nameB && distance < 0.1) {
     return 0.65;
   }
 
   // Partial name match with very close proximity
   if (
     (nameA.includes(nameB) || nameB.includes(nameA)) &&
     distance < 0.05
   ) {
     return 0.5;
   }
 
   return 0;
 };
 
 /**
  * Smart-merge hotel results from multiple suppliers
  * Returns unified list with shadow fallback capability
  */
 export const smartMergeHotels = (
   hbResults: NormalizedHotel[],
   rhResults: NormalizedHotel[],
   matchThreshold: number = 0.5
 ): SmartMergedHotel[] => {
   const merged = new Map<string, SmartMergedHotel>();
   const matchedRHIds = new Set<string>();
 
   // Process Hotelbeds first (typically higher inventory)
   hbResults.forEach((hbHotel) => {
     // Try to find matching RateHawk hotel
     let bestMatch: NormalizedHotel | null = null;
     let bestScore = 0;
 
     for (const rhHotel of rhResults) {
       if (matchedRHIds.has(rhHotel.id)) continue;
 
       const score = generateMatchScore(
         hbHotel as MatchableHotel,
         rhHotel as MatchableHotel
       );
 
       if (score > bestScore && score >= matchThreshold) {
         bestScore = score;
         bestMatch = rhHotel;
       }
     }
 
     if (bestMatch) {
       matchedRHIds.add(bestMatch.id);
 
       // Determine which supplier has better price
       const hbPrice = hbHotel.minPrice;
       const rhPrice = bestMatch.minPrice;
       const isCheaper = hbPrice <= rhPrice;
 
       const primary = isCheaper ? hbHotel : bestMatch;
       const fallback = isCheaper ? bestMatch : hbHotel;
       const savings = Math.abs(hbPrice - rhPrice);
 
       merged.set(hbHotel.id, {
         ...primary,
         zivoMasterId: `ZVO-${primary.supplierCode}-${primary.supplierHotelId}`,
         primaryRate: Math.min(hbPrice, rhPrice),
         fallbackRate: Math.max(hbPrice, rhPrice),
         supplierPriority: primary.supplierCode as PropertySource,
         fallbackSupplier: fallback.supplierCode as PropertySource,
         inventorySource: "AGGREGATED_ZIVO_FEED",
         matchScore: bestScore,
         savings,
         savingsPercent: Math.round((savings / Math.max(hbPrice, rhPrice)) * 100),
       });
     } else {
       // No match found - single supplier result
       merged.set(hbHotel.id, {
         ...hbHotel,
         zivoMasterId: `ZVO-${hbHotel.supplierCode}-${hbHotel.supplierHotelId}`,
         primaryRate: hbHotel.minPrice,
         fallbackRate: null,
         supplierPriority: hbHotel.supplierCode as PropertySource,
         fallbackSupplier: null,
         inventorySource: "SINGLE_SUPPLIER",
         matchScore: 0,
       });
     }
   });
 
   // Add unmatched RateHawk hotels
   rhResults.forEach((rhHotel) => {
     if (!matchedRHIds.has(rhHotel.id)) {
       merged.set(rhHotel.id, {
         ...rhHotel,
         zivoMasterId: `ZVO-${rhHotel.supplierCode}-${rhHotel.supplierHotelId}`,
         primaryRate: rhHotel.minPrice,
         fallbackRate: null,
         supplierPriority: rhHotel.supplierCode as PropertySource,
         fallbackSupplier: null,
         inventorySource: "SINGLE_SUPPLIER",
         matchScore: 0,
       });
     }
   });
 
   return Array.from(merged.values());
 };
 
 /**
  * Get merge statistics for analytics
  */
 export const getMergeStats = (hotels: SmartMergedHotel[]) => {
   const aggregated = hotels.filter((h) => h.inventorySource === "AGGREGATED_ZIVO_FEED");
   const avgSavings = aggregated.length
     ? aggregated.reduce((sum, h) => sum + (h.savings ?? 0), 0) / aggregated.length
     : 0;
   const avgMatchScore = aggregated.length
     ? aggregated.reduce((sum, h) => sum + h.matchScore, 0) / aggregated.length
     : 0;
 
   return {
     total: hotels.length,
     aggregatedCount: aggregated.length,
     singleSupplierCount: hotels.length - aggregated.length,
     matchRate: Math.round((aggregated.length / hotels.length) * 100),
     avgSavings: Math.round(avgSavings),
     maxSavings: Math.max(...hotels.map((h) => h.savings ?? 0)),
     avgMatchScore: Math.round(avgMatchScore * 100) / 100,
   };
 };