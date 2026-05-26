/**
 * Unified Hotel Types
 * Provider-agnostic hotel data structures for the ZIVO platform
 * Supports normalization from multiple suppliers (Hotelbeds, RateHawk, TripAdvisor, etc.)
 */

// ==================== CORE HOTEL TYPES ====================

export type PaymentType = "prepaid" | "pay_at_hotel";
export type SupplierCode = "hotelbeds" | "ratehawk" | "tripadvisor" | "booking" | "mock";

export interface NormalizedHotel {
  id: string;                          // Unique ID (prefixed with supplier code)
  supplierCode: SupplierCode;          // Source supplier
  supplierHotelId: string;             // Original supplier hotel ID
  
  // Basic Info
  name: string;
  description?: string;
  stars: number;                       // 1-5 star rating
  starsLabel?: string;                 // "5 Star Hotel", "Boutique", etc.
  
  // Location
  destination: string;                 // City/destination name
  address?: string;
  zone?: string;                       // District/neighborhood
  latitude?: number;
  longitude?: number;
  distanceFromCenter?: number;         // km from city center
  
  // Media
  imageUrl: string;                    // Primary image
  images: string[];                    // All images
  
  // Pricing
  minPrice: number;                    // Lowest available rate (total)
  maxPrice?: number;                   // Highest available rate
  pricePerNight: number;               // Per night price (for display)
  currency: string;                    // ISO currency code
  
  // Availability
  rooms: NormalizedRoom[];
  
  // Features
  facilities: string[];                // Amenities list
  boardTypes: string[];                // Available meal plans
  
  // Reviews
  reviewScore?: number;                // 0-10 scale
  reviewCount?: number;
  
  // Booking flags
  hasFreeCancellation: boolean;
  hasPayAtHotel: boolean;
  hasPrepaidOnly: boolean;
  
  // Raw data for debugging
  _raw?: unknown;
}

export interface NormalizedRoom {
  code: string;
  name: string;
  description?: string;
  maxOccupancy?: number;
  rates: NormalizedRate[];
  images?: string[];
}

export interface NormalizedRate {
  rateKey: string;                     // Unique rate identifier for booking
  
  // Pricing
  totalPrice: number;                  // Total stay price
  pricePerNight: number;
  nights: number;
  currency: string;
  taxes?: number;
  fees?: number;
  
  // Board/Meal
  boardCode: string;                   // RO, BB, HB, FB, AI
  boardName: string;                   // Room Only, Bed & Breakfast, etc.
  
  // Payment
  paymentType: PaymentType;
  requiresDeposit?: boolean;
  depositAmount?: number;
  
  // Cancellation
  freeCancellation: boolean;
  cancellationDeadline?: string;       // ISO date string
  cancellationPolicies?: CancellationPolicy[];
  
  // Availability
  allotment?: number;                  // Rooms available
  requiresRecheck?: boolean;           // Price needs revalidation
  
  // Supplier tracking
  supplierCode: SupplierCode;
  supplierRateId?: string;
}

export interface CancellationPolicy {
  from: string;                        // ISO date from which policy applies
  amount: number;                      // Penalty amount
  currency: string;
  percentage?: number;                 // Penalty as percentage
  isFullRefund?: boolean;
}

// ==================== SEARCH TYPES ====================

export interface HotelSearchRequest {
  // Location
  destination: string;                 // City code or name
  destinationType?: "city" | "hotel" | "geo";
  latitude?: number;
  longitude?: number;
  radius?: number;                     // km for geo search
  
  // Dates
  checkIn: string;                     // YYYY-MM-DD
  checkOut: string;
  
  // Guests
  rooms: number;
  adults: number;
  children: number;
  childAges?: number[];
  
  // Filters
  minStars?: number;
  maxStars?: number;
  minPrice?: number;
  maxPrice?: number;
  boardCodes?: string[];
  
  // Options
  currency?: string;
  language?: string;
  includeUnavailable?: boolean;
}

export interface HotelSearchResult {
  hotels: NormalizedHotel[];
  total: number;
  
  // Meta
  searchId?: string;
  searchParams: HotelSearchRequest;
  timestamp: string;
  
  // Supplier breakdown
  supplierResults: {
    supplier: SupplierCode;
    count: number;
    responseTime?: number;
    error?: string;
  }[];
  
  // Price range for filters
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
}

// ==================== BOOKING TYPES ====================

export interface HotelBookingRequest {
  rateKey: string;
  supplierCode: SupplierCode;
  
  // Guest info
  holder: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  
  guests: GuestInfo[];
  
  // Payment
  paymentType: PaymentType;
  paymentIntentId?: string;            // Stripe payment intent for prepaid
  
  // Reference
  clientReference: string;
  remarks?: string;
}

export interface GuestInfo {
  roomIndex: number;
  firstName: string;
  lastName: string;
  type: "adult" | "child";
  age?: number;
}

export interface HotelBookingResponse {
  success: boolean;
  
  // Booking details
  bookingReference?: string;           // ZIVO booking ref
  supplierReference?: string;          // Supplier confirmation
  supplierCode: SupplierCode;
  
  status: "confirmed" | "pending" | "failed" | "cancelled";
  
  // Details
  hotel?: {
    name: string;
    address?: string;
    checkIn: string;
    checkOut: string;
  };
  
  totalAmount?: number;
  currency?: string;
  paymentType?: PaymentType;
  
  // If prepaid
  paymentCaptured?: boolean;
  capturedAmount?: number;
  
  // If pay at hotel
  payAtHotelAmount?: number;
  
  // Cancellation
  cancellationDeadline?: string;
  
  error?: string;
}

// ==================== RATE CHECK TYPES ====================

export interface RateCheckRequest {
  rateKey: string;
  supplierCode: SupplierCode;
}

export interface RateCheckResponse {
  success: boolean;
  available: boolean;
  
  // Updated rate info (may differ from search)
  rate?: NormalizedRate;
  priceChanged?: boolean;
  originalPrice?: number;
  currentPrice?: number;
  
  error?: string;
}

// ==================== BOARD TYPE MAPPING ====================

export const BOARD_CODES: Record<string, string> = {
  RO: "Room Only",
  BB: "Bed & Breakfast",
  HB: "Half Board",
  FB: "Full Board",
  AI: "All Inclusive",
  SC: "Self Catering",
};

export const BOARD_CODE_ALIASES: Record<string, string> = {
  "room_only": "RO",
  "bed_and_breakfast": "BB",
  "half_board": "HB",
  "full_board": "FB",
  "all_inclusive": "AI",
  "self_catering": "SC",
};

// ==================== FACILITY MAPPING ====================

export const FACILITY_ICONS: Record<string, string> = {
  wifi: "wifi",
  pool: "waves",
  parking: "car",
  gym: "dumbbell",
  spa: "sparkles",
  restaurant: "utensils",
  bar: "wine",
  breakfast: "coffee",
  airport_shuttle: "plane",
  room_service: "bell",
  laundry: "shirt",
  concierge: "user",
  business_center: "briefcase",
  meeting_rooms: "users",
  pet_friendly: "paw-print",
  ac: "thermometer",
  tv: "tv",
  minibar: "glass-water",
  safe: "lock",
  balcony: "square",
};
