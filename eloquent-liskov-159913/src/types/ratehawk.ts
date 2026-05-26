/**
 * RateHawk API Types
 * Types for RateHawk hotel search and booking API
 */

// ==================== SEARCH TYPES ====================

export interface RateHawkSearchRequest {
  checkin: string;  // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  residency: string; // ISO country code
  language: string;
  guests: RateHawkGuests[];
  region_id?: number;
  currency?: string;
}

export interface RateHawkGuests {
  adults: number;
  children?: number[];  // Array of child ages
}

export interface RateHawkSearchResponse {
  data: {
    hotels: RateHawkHotel[];
  };
  debug?: {
    request_id: string;
    hotel_count: number;
  };
}

// ==================== HOTEL TYPES ====================

export interface RateHawkHotel {
  id: string;
  name: string;
  star_rating: number;
  address: string;
  geo: RateHawkGeo;
  images: string[];
  amenities?: string[];
  rates: RateHawkRate[];
  region?: {
    id: number;
    name: string;
    country_code: string;
  };
  kind?: string; // hotel, hostel, apartment, etc.
}

export interface RateHawkGeo {
  lat: number;
  lon: number;
}

export interface RateHawkRate {
  book_hash: string;
  match_hash?: string;
  daily_prices: number[];
  meal: string;
  meal_data?: {
    name: string;
    kind: string;
  };
  payment_options: RateHawkPaymentOptions;
  room_name: string;
  room_data_trans?: {
    main_name: string;
  };
  rg_ext?: {
    class: number;
    quality: number;
    sex: number;
    bathroom: number;
    bedding: number;
    family: number;
    capacity: number;
    club: number;
  };
  amount_net: string;
  amount_sell?: string;
  amount_payable?: string;
  currency: string;
  cancellation_info?: RateHawkCancellationInfo;
  taxes?: RateHawkTax[];
  no_show?: {
    amount: string;
    currency: string;
  };
  serp_filters?: string[];
  sell_price_criteria?: {
    sell_price: string;
    discount: number;
  };
}

export interface RateHawkPaymentOptions {
  payment_types: RateHawkPaymentType[];
  recommended?: string;
}

export interface RateHawkPaymentType {
  amount: string;
  currency_code: string;
  show_amount: string;
  show_currency_code: string;
  by?: string; // "now" | "hotel"
  is_need_credit_card_data?: boolean;
  is_need_cvc?: boolean;
  type?: string; // "deposit" | "full"
  tax_data?: {
    taxes?: RateHawkTax[];
  };
  cancellation_penalties?: RateHawkCancellationPenalty;
  vat_data?: {
    vat_applicable: boolean;
  };
  recommended?: boolean;
  commission_percent_info?: {
    show: string;
    formatted: string;
  };
}

export interface RateHawkCancellationInfo {
  free_cancellation_before?: string;  // ISO datetime
  policies?: RateHawkCancellationPolicy[];
}

export interface RateHawkCancellationPolicy {
  start_at?: string;
  end_at?: string;
  amount_charge?: string;
  amount_show?: string;
  currency?: string;
}

export interface RateHawkCancellationPenalty {
  policies?: RateHawkCancellationPolicy[];
  free_cancellation_before?: string;
}

export interface RateHawkTax {
  name: string;
  amount: string;
  currency: string;
  included_by_supplier: boolean;
}

// ==================== BOOKING TYPES ====================

export interface RateHawkBookingRequest {
  partner_order_id: string;
  book_hash: string;
  language: string;
  guests: RateHawkBookingGuest[];
  user_ip: string;
  payment_type?: {
    type: string;
    amount?: string;
    currency?: string;
  };
}

export interface RateHawkBookingGuest {
  adults: RateHawkGuestInfo[];
  children?: RateHawkGuestInfo[];
}

export interface RateHawkGuestInfo {
  first_name: string;
  last_name: string;
  age?: number;
  is_child?: boolean;
}

export interface RateHawkBookingResponse {
  data: {
    order_id: string;
    partner_order_id: string;
    status: "ok" | "pending" | "failed";
    item_id?: string;
    confirmation_id?: string;
    nights: number;
    checkin: string;
    checkout: string;
    hotel_data?: {
      id: string;
      name: string;
      address: string;
      phone?: string;
    };
    room_data?: {
      name: string;
      meal_name: string;
    };
    amount_payable?: {
      amount: string;
      currency: string;
    };
    amount_at_hotel?: {
      amount: string;
      currency: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

// ==================== RATE CHECK TYPES ====================

export interface RateHawkRateCheckRequest {
  book_hash: string;
  language?: string;
}

export interface RateHawkRateCheckResponse {
  data: {
    status: "available" | "sold" | "price_changed";
    rate?: RateHawkRate;
    new_book_hash?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ==================== REGION TYPES ====================

export interface RateHawkRegion {
  id: number;
  name: string;
  country_code: string;
  type: string; // city, region, country
  parent_id?: number;
  iata?: string[];
}

// ==================== HOTEL CONTENT TYPES ====================

export interface RateHawkHotelContent {
  id: string;
  name: string;
  description?: string;
  star_rating: number;
  address: string;
  geo: RateHawkGeo;
  images: RateHawkImage[];
  amenity_groups?: RateHawkAmenityGroup[];
  room_groups?: RateHawkRoomGroup[];
  policy?: RateHawkPolicy;
}

export interface RateHawkImage {
  url: string;
  tmb_url?: string;
}

export interface RateHawkAmenityGroup {
  group_name: string;
  amenities: string[];
}

export interface RateHawkRoomGroup {
  room_group_id: number;
  name: string;
  name_struct?: {
    main_name: string;
    bedding_type?: string;
    bathroom?: string;
  };
  images?: RateHawkImage[];
  room_amenities?: string[];
}

export interface RateHawkPolicy {
  check_in_time?: string;
  check_out_time?: string;
  internet?: string;
  parking?: string;
  pets?: string;
  children?: string;
}
