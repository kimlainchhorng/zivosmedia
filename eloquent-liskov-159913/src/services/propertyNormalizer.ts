/**
 * ZivoProperty Normalizer Service
 * Transforms supplier-specific hotel data into unified ZIVO Property format
 * Supports comparison and deduplication across multiple suppliers
 */

import type { ZivoProperty, ZivoPropertyExtended, PropertySource, PricingType, InventoryStatus, PropertyMatchKey, PropertyMatchGroup, ZivoPropertyRate } from "@/types/zivoProperty";
import type { ZivoAlternativeRate } from "@/types/zivoProperty";
import type { HotelbedsHotel, HotelbedsRate } from "@/types/hotelbeds";
import type { RateHawkHotel, RateHawkRate } from "@/types/ratehawk";
import { calculateMarkup } from "@/config/pricing";

// ==================== HOTELBEDS NORMALIZER ====================

/**
 * Normalize Hotelbeds hotel to ZivoPropertyExtended
 */
export function normalizeHotelbedsToZivoProperty(
  hotel: HotelbedsHotel,
  nights: number
): ZivoPropertyExtended {
  const categoryToStars: Record<string, number> = {
    "1EST": 1, "2EST": 2, "3EST": 3, "4EST": 4, "5EST": 5,
    "1LL": 1, "2LL": 2, "3LL": 3, "4LL": 4, "5LL": 5,
    "H1": 1, "H2": 2, "H3": 3, "H4": 4, "H5": 5,
  };
  
  const stars = categoryToStars[hotel.categoryCode] || 3;
  const baseImageUrl = "https://photos.hotelbeds.com/giata";
  const images = hotel.images?.map(img => `${baseImageUrl}/${img.path}`) || [];
  
  // Get best rate
  const allRates = hotel.rooms.flatMap(r => r.rates);
  const bestRate = allRates.reduce((best, rate) => {
    const netPrice = parseFloat(rate.net);
    return netPrice < parseFloat(best.net) ? rate : best;
  }, allRates[0]);
  
  const netPrice = parseFloat(bestRate?.net || "0");
  const markup = calculateMarkup(netPrice, "hotels", "hotelbeds");
  const totalAmount = netPrice + markup;
  
  // Determine payment type
  const paymentType: PricingType = bestRate?.paymentType === "AT_HOTEL" ? "PAY_AT_HOTEL" : "PREPAID";
  
  // Check availability status
  const status: InventoryStatus = bestRate?.rateType === "RECHECK" ? "ON_REQUEST" : "AVAILABLE";
  
  // Check cancellation
  const hasFreeCancellation = allRates.some(rate => 
    rate.cancellationPolicies?.some(policy => new Date(policy.from) > new Date())
  );
  
  // Transform rooms
  const rooms = hotel.rooms.map(room => ({
    code: room.code,
    name: room.name,
    rates: room.rates.map(rate => normalizeHotelbedsRate(rate, nights, hotel.currency)),
  }));

  return {
    id: `hotelbeds-${hotel.code}`,
    source: "HOTELBEDS",
    
    meta: {
      name: hotel.name,
      starRating: stars,
      coordinates: {
        lat: parseFloat(hotel.latitude),
        lng: parseFloat(hotel.longitude),
      },
    },
    
    pricing: {
      amount: totalAmount,
      currency: hotel.currency,
      type: paymentType,
      isCheapest: false, // Will be set by comparison logic
    },
    
    inventory: {
      providerId: String(hotel.code),
      status,
    },
    
    // Extended fields
    imageUrl: images[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    images,
    destination: hotel.destinationName,
    zone: hotel.zoneName,
    
    reviewScore: hotel.reviews?.[0]?.rate,
    reviewCount: hotel.reviews?.[0]?.reviewCount,
    
    facilities: hotel.facilities?.map(f => f.description).filter(Boolean) || [],
    rooms,
    
    hasFreeCancellation,
    cancellationDeadline: bestRate?.cancellationPolicies?.[0]?.from,
    
    pricePerNight: totalAmount / nights,
    nights,
  };
}

/**
 * Normalize Hotelbeds rate to ZivoPropertyRate
 */
function normalizeHotelbedsRate(
  rate: HotelbedsRate,
  nights: number,
  currency: string
): ZivoPropertyRate {
  const netPrice = parseFloat(rate.net);
  const markup = calculateMarkup(netPrice, "hotels", "hotelbeds");
  const totalPrice = netPrice + markup;
  
  const hasFreeCancellation = rate.cancellationPolicies?.some(
    policy => new Date(policy.from) > new Date()
  ) || false;
  
  return {
    rateKey: rate.rateKey,
    source: "HOTELBEDS",
    totalPrice,
    pricePerNight: totalPrice / nights,
    nights,
    currency,
    taxes: rate.taxes?.reduce((sum, tax) => sum + parseFloat(tax.amount || "0"), 0),
    boardCode: rate.boardCode,
    boardName: rate.boardName || rate.boardCode,
    paymentType: rate.paymentType === "AT_HOTEL" ? "PAY_AT_HOTEL" : "PREPAID",
    freeCancellation: hasFreeCancellation,
    cancellationDeadline: rate.cancellationPolicies?.[0]?.from,
    allotment: rate.allotment,
    requiresRecheck: rate.rateType === "RECHECK",
  };
}

// ==================== RATEHAWK NORMALIZER ====================

/**
 * Normalize RateHawk hotel to ZivoPropertyExtended
 */
export function normalizeRateHawkToZivoProperty(
  hotel: RateHawkHotel,
  nights: number
): ZivoPropertyExtended {
  // Get best rate
  const bestRate = hotel.rates.reduce((best, rate) => {
    const amount = parseFloat(rate.amount_net);
    const bestAmount = parseFloat(best.amount_net);
    return amount < bestAmount ? rate : best;
  }, hotel.rates[0]);
  
  const netPrice = parseFloat(bestRate?.amount_net || "0");
  const markup = calculateMarkup(netPrice, "hotels", "ratehawk");
  const totalAmount = netPrice + markup;
  
  // Determine payment type from payment options
  const payByHotel = bestRate?.payment_options?.payment_types?.some(pt => pt.by === "hotel");
  const paymentType: PricingType = payByHotel ? "PAY_AT_HOTEL" : "PREPAID";
  
  // Check cancellation
  const hasFreeCancellation = bestRate?.cancellation_info?.free_cancellation_before 
    ? new Date(bestRate.cancellation_info.free_cancellation_before) > new Date()
    : false;
  
  // Transform rooms (RateHawk groups by rate, not room)
  const rooms = hotel.rates.map((rate, index) => ({
    code: `room-${index}`,
    name: rate.room_name || rate.room_data_trans?.main_name || "Standard Room",
    rates: [normalizeRateHawkRate(rate, nights)],
  }));

  return {
    id: `ratehawk-${hotel.id}`,
    source: "RATEHAWK",
    
    meta: {
      name: hotel.name,
      starRating: hotel.star_rating,
      coordinates: {
        lat: hotel.geo.lat,
        lng: hotel.geo.lon,
      },
    },
    
    pricing: {
      amount: totalAmount,
      currency: bestRate?.currency || "USD",
      type: paymentType,
      isCheapest: false,
    },
    
    inventory: {
      providerId: hotel.id,
      status: "AVAILABLE" as InventoryStatus,
    },
    
    // Extended fields
    imageUrl: hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    images: hotel.images || [],
    destination: hotel.region?.name || "",
    address: hotel.address,
    
    facilities: hotel.amenities || [],
    rooms,
    
    hasFreeCancellation,
    cancellationDeadline: bestRate?.cancellation_info?.free_cancellation_before,
    
    pricePerNight: totalAmount / nights,
    nights,
  };
}

/**
 * Normalize RateHawk rate to ZivoPropertyRate
 */
function normalizeRateHawkRate(rate: RateHawkRate, nights: number): ZivoPropertyRate {
  const netPrice = parseFloat(rate.amount_net);
  const markup = calculateMarkup(netPrice, "hotels", "ratehawk");
  const totalPrice = netPrice + markup;
  
  const payByHotel = rate.payment_options?.payment_types?.some(pt => pt.by === "hotel");
  
  const hasFreeCancellation = rate.cancellation_info?.free_cancellation_before 
    ? new Date(rate.cancellation_info.free_cancellation_before) > new Date()
    : false;
  
  return {
    rateKey: rate.book_hash,
    source: "RATEHAWK",
    totalPrice,
    pricePerNight: totalPrice / nights,
    nights,
    currency: rate.currency,
    taxes: rate.taxes?.reduce((sum, tax) => sum + parseFloat(tax.amount), 0),
    boardCode: rate.meal || "RO",
    boardName: rate.meal_data?.name || rate.meal || "Room Only",
    paymentType: payByHotel ? "PAY_AT_HOTEL" : "PREPAID",
    freeCancellation: hasFreeCancellation,
    cancellationDeadline: rate.cancellation_info?.free_cancellation_before,
  };
}

// ==================== PROPERTY MATCHING & COMPARISON ====================

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistanceMeters(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Normalize hotel name for matching
 */
function normalizeHotelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/hotel|resort|&|and|the|suites?|spa|boutique|inn/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate match key for property deduplication
 */
export function generateMatchKey(property: ZivoPropertyExtended): PropertyMatchKey {
  return {
    normalizedName: normalizeHotelName(property.meta.name),
    lat: property.meta.coordinates.lat,
    lng: property.meta.coordinates.lng,
  };
}

/**
 * Check if two properties are likely the same
 * Properties match if names are similar AND coordinates are within 100m
 */
export function propertiesMatch(
  key1: PropertyMatchKey,
  key2: PropertyMatchKey
): boolean {
  // Check coordinate proximity (within 100 meters)
  const distance = calculateDistanceMeters(key1.lat, key1.lng, key2.lat, key2.lng);
  if (distance > 100) return false;
  
  // Check name similarity
  const name1Parts = key1.normalizedName.split(" ").filter(p => p.length > 2);
  const name2Parts = key2.normalizedName.split(" ").filter(p => p.length > 2);
  
  // At least 50% of significant words should match
  const matches = name1Parts.filter(p => name2Parts.includes(p));
  const matchRatio = matches.length / Math.max(name1Parts.length, name2Parts.length);
  
  return matchRatio >= 0.5;
}

/**
 * Group properties by match for deduplication
 */
export function groupPropertiesByMatch(
  properties: ZivoPropertyExtended[]
): PropertyMatchGroup[] {
  const groups: PropertyMatchGroup[] = [];
  const assigned = new Set<string>();
  
  for (const property of properties) {
    if (assigned.has(property.id)) continue;
    
    const key = generateMatchKey(property);
    const group: PropertyMatchGroup = {
      matchKey: key,
      properties: [property],
      bestPrice: property.pricing.amount,
      bestSource: property.source,
    };
    
    assigned.add(property.id);
    
    // Find matching properties
    for (const other of properties) {
      if (assigned.has(other.id)) continue;
      
      const otherKey = generateMatchKey(other);
      if (propertiesMatch(key, otherKey)) {
        group.properties.push(other);
        assigned.add(other.id);
        
        if (other.pricing.amount < group.bestPrice) {
          group.bestPrice = other.pricing.amount;
          group.bestSource = other.source;
        }
      }
    }
    
    groups.push(group);
  }
  
  return groups;
}

/**
 * Mark cheapest property in each group and add alternative rates
 */
export function markCheapestProperties(
  properties: ZivoPropertyExtended[]
): ZivoPropertyExtended[] {
  const groups = groupPropertiesByMatch(properties);
  const result: ZivoPropertyExtended[] = [];
  
  for (const group of groups) {
    // Find minimum price in group
    const minPrice = Math.min(...group.properties.map(p => p.pricing.amount));
    
    // Mark cheapest and add alternative rates
    for (const property of group.properties) {
      const isCheapest = property.pricing.amount === minPrice;
      
      // Build alternative rates from other suppliers
      const alternativeRates: ZivoAlternativeRate[] = group.properties
        .filter(p => p.id !== property.id)
        .map(p => ({
          source: p.source,
          providerId: p.inventory.providerId,
          amount: p.pricing.amount,
          currency: p.pricing.currency,
          type: p.pricing.type,
          difference: p.pricing.amount - property.pricing.amount,
          differencePercent: ((p.pricing.amount - property.pricing.amount) / property.pricing.amount) * 100,
        }));
      
      result.push({
        ...property,
        pricing: {
          ...property.pricing,
          isCheapest,
        },
        alternativeRates: alternativeRates.length > 0 ? alternativeRates : undefined,
      });
    }
  }
  
  return result;
}

/**
 * Merge and deduplicate properties from multiple suppliers
 * Returns unified list with best price marked
 */
export function mergeMultiSourceProperties(
  hotelbedsProperties: ZivoPropertyExtended[],
  ratehawkProperties: ZivoPropertyExtended[]
): ZivoPropertyExtended[] {
  const allProperties = [...hotelbedsProperties, ...ratehawkProperties];
  return markCheapestProperties(allProperties);
}
