/**
 * Server-Side Maps API Client
 * 
 * Wraps edge functions for secure Google Maps API access.
 * API key is kept server-side for security.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface PlaceSuggestion {
  description: string;
  place_id: string;
  main_text: string;
}

export interface PlaceDetails {
  address: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TrafficSegment {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  speed: "NORMAL" | "SLOW" | "TRAFFIC_JAM";
}

export interface RouteResult {
  distance_miles: number;
  duration_minutes: number;
  duration_in_traffic_minutes: number | null;
  traffic_level: "light" | "moderate" | "heavy" | null;
  traffic_ratio: number | null;
  polyline: string | null;
  traffic_segments?: TrafficSegment[] | null;
  start_address?: string;
  end_address?: string;
  eta_iso?: string;
  legs?: RouteLeg[];
}

export interface RouteLeg {
  distance_miles: number;
  duration_minutes: number;
  duration_in_traffic_minutes: number;
  start_address: string;
  end_address: string;
}

// ── Autocomplete ───────────────────────────────────────

export async function getAutocompleteSuggestions(
  input: string,
  proximity?: { lat: number; lng: number },
  country?: string
): Promise<PlaceSuggestion[]> {
  if (!input || input.trim().length < 2) return [];

  try {
    const body: Record<string, unknown> = { input: input.trim() };
    if (proximity) body.proximity = proximity;
    if (country) body.country = country;

    const { data, error } = await supabase.functions.invoke("maps-autocomplete", { body });
    if (error || !data?.ok) return [];
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

// ── Place Details ──────────────────────────────────────

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!placeId) return null;

  try {
    const { data, error } = await supabase.functions.invoke("maps-place-details", {
      body: { place_id: placeId },
    });
    if (error || !data?.ok) return null;
    return { address: data.address, name: data.name, lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

// ── Routing ────────────────────────────────────────────

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: { lat: number; lng: number }[]
): Promise<RouteResult | null> {
  try {
    const body: Record<string, unknown> = {
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      dest_lat: destination.lat,
      dest_lng: destination.lng,
    };
    if (waypoints && waypoints.length > 0) body.waypoints = waypoints;

    const { data, error } = await supabase.functions.invoke("maps-route", { body });
    if (error || !data?.ok) return null;

    return {
      distance_miles: data.distance_miles,
      duration_minutes: data.duration_minutes,
      duration_in_traffic_minutes: data.duration_in_traffic_minutes ?? null,
      traffic_level: data.traffic_level ?? null,
      traffic_ratio: data.traffic_ratio ?? null,
      polyline: data.polyline,
      traffic_segments: data.traffic_segments ?? null,
      start_address: data.start_address,
      end_address: data.end_address,
      eta_iso: data.eta_iso,
      legs: data.legs,
    };
  } catch {
    return null;
  }
}

// ── Reverse Geocode ────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const fallback = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  
  // Validate coordinates before calling edge function
  if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)
      || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn("[reverseGeocode] Invalid coordinates:", { lat, lng });
    return fallback;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke("maps-reverse-geocode", {
      body: { lat, lng },
    });
    if (error || !data?.ok) return fallback;
    return data.address ?? fallback;
  } catch {
    return fallback;
  }
}

// ── Forward Geocode (address → coordinates) ────────────

export async function forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 3) return null;

  try {
    // Use autocomplete + place details as a two-step forward geocode
    const suggestions = await getAutocompleteSuggestions(address);
    if (suggestions.length === 0) return null;
    
    const details = await getPlaceDetails(suggestions[0].place_id);
    if (!details) return null;
    
    return { lat: details.lat, lng: details.lng };
  } catch {
    return null;
  }
}

// ── Haversine Distance ─────────────────────────────────

export function haversineMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Arrival Threshold Check ────────────────────────────

export function isWithinArrivalThreshold(
  driverLat: number, driverLng: number,
  targetLat: number, targetLng: number,
  thresholdMiles: number = 0.10
): boolean {
  return haversineMiles(driverLat, driverLng, targetLat, targetLng) <= thresholdMiles;
}

// ── Polyline Decoder ───────────────────────────────────

/** Decode Google Maps encoded polyline into lat/lng array */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

// ── ETA Formatting ─────────────────────────────────────

/** Format duration in minutes to human-readable string */
export function formatETA(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** Format distance in miles to human-readable string */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
