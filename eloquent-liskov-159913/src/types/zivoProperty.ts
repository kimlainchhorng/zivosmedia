/**
 * ZIVO Unified Property Schema
 * Provider-agnostic property format for multi-supplier comparison
 * Supports Hotelbeds, RateHawk, and future suppliers
 */

// ==================== CORE TYPES ====================

export type PropertySource = "HOTELBEDS" | "RATEHAWK";
export type PricingType = "PREPAID" | "PAY_AT_HOTEL";
export type InventoryStatus = "AVAILABLE" | "ON_REQUEST" | "SOLD_OUT";

// ==================== ZIVO PROPERTY SCHEMA ====================

/**
 * Core ZivoProperty schema - minimal unified format for comparison
 */
export interface ZivoProperty {
  /** ZIVO internal UUID */
  id: string;
  
  /** Source supplier */
  source: PropertySource;
  
  /** Property metadata */
  meta: {
    name: string;
    starRating: number;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  
  /** Pricing information */
  pricing: {
    /** Net price after markup (total for stay) */
    amount: number;
    /** ISO currency code */
    currency: string;
    /** Payment type */
    type: PricingType;
    /** Computed by comparison logic - true if lowest price for this property */
    isCheapest: boolean;
  };
  
  /** Inventory tracking */
  inventory: {
    /** Original supplier property ID */
    providerId: string;
    /** Availability status */
    status: InventoryStatus;
  };
}

// ==================== EXTENDED PROPERTY SCHEMA ====================

/**
 * Extended ZivoProperty for full UI display
 * Includes all fields needed for result cards and detail pages
 */
export interface ZivoPropertyExtended extends ZivoProperty {
  /** Display fields */
  imageUrl: string;
  images: string[];
  destination: string;
  zone?: string;
  address?: string;
  
  /** Reviews */
  reviewScore?: number;
  reviewCount?: number;
  
  /** Amenities */
  facilities: string[];
  
  /** Rooms & Rates (for detailed view) */
  rooms?: ZivoPropertyRoom[];
  
  /** Booking flags */
  hasFreeCancellation: boolean;
  cancellationDeadline?: string;
  
  /** Price per night (derived from amount / nights) */
  pricePerNight: number;
  nights: number;
  
  /** Distance from city center in km */
  distanceFromCenter?: number;
  
  /** Alternative rates from other suppliers */
  alternativeRates?: ZivoAlternativeRate[];
}

/**
 * Room information within a property
 */
export interface ZivoPropertyRoom {
  code: string;
  name: string;
  description?: string;
  maxOccupancy?: number;
  rates: ZivoPropertyRate[];
  images?: string[];
}

/**
 * Rate information for a room
 */
export interface ZivoPropertyRate {
  rateKey: string;
  source: PropertySource;
  
  /** Pricing */
  totalPrice: number;
  pricePerNight: number;
  nights: number;
  currency: string;
  taxes?: number;
  
  /** Meal plan */
  boardCode: string;
  boardName: string;
  
  /** Payment */
  paymentType: PricingType;
  
  /** Cancellation */
  freeCancellation: boolean;
  cancellationDeadline?: string;
  
  /** Availability */
  allotment?: number;
  requiresRecheck?: boolean;
}

/**
 * Alternative rate from different supplier for price comparison
 */
export interface ZivoAlternativeRate {
  source: PropertySource;
  providerId: string;
  amount: number;
  currency: string;
  type: PricingType;
  difference: number; // Price difference from main rate (positive = more expensive)
  differencePercent: number;
}

// ==================== SEARCH RESULT TYPES ====================

/**
 * Multi-provider search result containing unified properties
 */
export interface ZivoPropertySearchResult {
  properties: ZivoPropertyExtended[];
  total: number;
  
  /** Search metadata */
  searchId: string;
  searchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    adults: number;
    children?: number;
  };
  timestamp: string;
  
  /** Supplier breakdown */
  supplierResults: {
    supplier: PropertySource;
    count: number;
    responseTimeMs?: number;
    error?: string;
  }[];
  
  /** Price range for filters */
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  
  /** Match statistics */
  matchStats: {
    totalProperties: number;
    matchedAcrossSuppliers: number;
    uniqueHotelbeds: number;
    uniqueRatehawk: number;
  };
}

// ==================== PROPERTY MATCHING ====================

/**
 * Property match key for deduplication
 */
export interface PropertyMatchKey {
  normalizedName: string;
  lat: number;
  lng: number;
}

/**
 * Matched property group (same property from multiple suppliers)
 */
export interface PropertyMatchGroup {
  matchKey: PropertyMatchKey;
  properties: ZivoPropertyExtended[];
  bestPrice: number;
  bestSource: PropertySource;
}
