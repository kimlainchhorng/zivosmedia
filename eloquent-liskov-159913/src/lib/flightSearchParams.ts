/**
 * Flight Search URL Parameter Validation & Parsing
 * Properly extracts IATA codes, validates dates, passengers, cabin, tripType
 */

import { getAirportByCode, type Airport } from "@/data/airports";

export interface ParsedFlightSearchParams {
  // Core IATA codes (always 3 uppercase letters)
  originIata: string;
  destinationIata: string;
  
  // Full airport info (if found in database)
  originAirport: Airport | null;
  destinationAirport: Airport | null;
  
  // Display strings
  originDisplay: string;
  destinationDisplay: string;
  
  // Dates (YYYY-MM-DD format, validated)
  departureDate: string | null;
  returnDate: string | null;
  
  // Passengers (1-9, validated)
  passengers: number;
  
  // Cabin class (validated)
  cabinClass: 'economy' | 'premium' | 'business' | 'first';
  
  // Trip type (validated)
  tripType: 'oneway' | 'roundtrip';
  
  // Validation status
  isValid: boolean;
  errors: string[];
}

// Valid cabin classes
const VALID_CABINS = ['economy', 'premium', 'business', 'first'] as const;
type CabinClass = typeof VALID_CABINS[number];

// Valid trip types
const VALID_TRIP_TYPES = ['oneway', 'roundtrip'] as const;
type TripType = typeof VALID_TRIP_TYPES[number];

/**
 * Extract IATA code from various input formats:
 * - "MSY" (raw IATA)
 * - "New Orleans (MSY)" (city + IATA)
 * - "New Orleans, USA (MSY)" (city + country + IATA)
 */
export function extractIataCode(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim().toUpperCase();
  
  // Check if it's already a raw 3-letter IATA code
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Extract from "City (IATA)" format
  const match = input.match(/\(([A-Z]{3})\)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  
  return null;
}

/**
 * Validate date string is in YYYY-MM-DD format and is a valid date
 */
export function validateDateString(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Check format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  
  // Check it's a valid date
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Return validated date string
  return dateStr;
}

/**
 * Validate passengers count (1-9)
 */
export function validatePassengers(value: string | null): number {
  if (!value) return 1;
  
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 1 || num > 9) {
    return 1;
  }
  
  return num;
}

/**
 * Validate cabin class
 */
export function validateCabinClass(value: string | null): CabinClass {
  if (!value) return 'economy';
  
  const lower = value.toLowerCase() as CabinClass;
  if (VALID_CABINS.includes(lower)) {
    return lower;
  }
  
  return 'economy';
}

/**
 * Validate trip type
 */
export function validateTripType(value: string | null): TripType {
  if (!value) return 'roundtrip';
  
  const normalized = value.toLowerCase().replace(/-/g, '').replace(/_/g, '');
  
  if (normalized === 'oneway') return 'oneway';
  if (normalized === 'roundtrip') return 'roundtrip';
  
  return 'roundtrip';
}

/**
 * Parse and validate all flight search URL parameters
 */
export function parseFlightSearchParams(searchParams: URLSearchParams): ParsedFlightSearchParams {
  const errors: string[] = [];
  
  // Extract and validate origin - support both 'from' and 'origin' params
  const fromRaw = searchParams.get('from') || searchParams.get('origin') || '';
  const originIata = extractIataCode(fromRaw);
  
  if (!originIata) {
    errors.push('Invalid origin airport. Please use a valid 3-letter IATA code.');
  }
  
  // Extract and validate destination - support both 'to' and 'dest' params
  const toRaw = searchParams.get('to') || searchParams.get('dest') || searchParams.get('destination') || '';
  const destinationIata = extractIataCode(toRaw);
  
  if (!destinationIata) {
    errors.push('Invalid destination airport. Please use a valid 3-letter IATA code.');
  }
  
  // Look up airports in database
  const originAirport = originIata ? getAirportByCode(originIata) || null : null;
  const destinationAirport = destinationIata ? getAirportByCode(destinationIata) || null : null;
  
  // Generate display strings
  const originDisplay = originAirport 
    ? `${originAirport.city} (${originAirport.code})`
    : originIata || fromRaw;
  
  const destinationDisplay = destinationAirport
    ? `${destinationAirport.city} (${destinationAirport.code})`
    : destinationIata || toRaw;
  
  // Validate dates
  const departDateRaw = searchParams.get('depart');
  const returnDateRaw = searchParams.get('return');
  
  const departureDate = validateDateString(departDateRaw);
  const returnDate = validateDateString(returnDateRaw);
  
  if (!departureDate) {
    errors.push('Invalid departure date. Please use YYYY-MM-DD format.');
  }
  
  // Validate passengers
  const passengers = validatePassengers(searchParams.get('passengers'));
  
  // Validate cabin class
  const cabinClass = validateCabinClass(searchParams.get('cabin'));
  
  // Validate trip type
  const tripType = validateTripType(searchParams.get('tripType'));
  
  // If roundtrip but no return date, that's a warning (not error)
  if (tripType === 'roundtrip' && !returnDate && departureDate) {
    // This is acceptable - user might want to search one-way or add return later
  }
  
  return {
    originIata: originIata || '',
    destinationIata: destinationIata || '',
    originAirport,
    destinationAirport,
    originDisplay,
    destinationDisplay,
    departureDate,
    returnDate,
    passengers,
    cabinClass,
    tripType,
    isValid: errors.length === 0 && !!originIata && !!destinationIata && !!departureDate,
    errors,
  };
}

/**
 * Build flight search URL with proper parameter encoding
 */
export function buildFlightSearchUrl(params: {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: CabinClass;
  tripType?: TripType;
}): string {
  const searchParams = new URLSearchParams();
  
  // Use raw IATA codes (not city + IATA format)
  searchParams.set('from', params.originIata);
  searchParams.set('to', params.destinationIata);
  searchParams.set('depart', params.departureDate);
  
  if (params.returnDate) {
    searchParams.set('return', params.returnDate);
  }
  
  searchParams.set('passengers', String(params.passengers || 1));
  searchParams.set('cabin', params.cabinClass || 'economy');
  searchParams.set('tripType', params.tripType || 'roundtrip');
  
  return `/flights/results?${searchParams.toString()}`;
}
