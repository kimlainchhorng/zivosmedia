/**
 * useFlightArrivalPickup — Links a customer's flight booking to a ride request
 * so drivers can see flight number + arrival time for airport pickups.
 * 
 * Also provides airport detection from pickup address keywords.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FlightArrivalInfo {
  flightNumber: string | null;
  arrivalTime: string | null;
  bookingId: string;
  origin: string;
  destination: string;
  bookingReference: string;
}

/** Common airport keywords to detect airport-based pickups */
const AIRPORT_KEYWORDS = [
  "airport", "terminal", "intl", "international",
  "ព្រលានយន្តហោះ", // Khmer for airport
  "arrivals", "departures",
  // IATA codes for supported markets
  "jfk", "lax", "ord", "atl", "sfo", "mia", "dfw", "sea", "bos", "den",
  "pnh", "rep", "kti", "kos", // Cambodia airports
  "bkk", "dmk", // Thailand
  "icn", "nrt", "hnd", // Korea/Japan
];

/**
 * Check if an address likely refers to an airport
 */
export function isAirportAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return AIRPORT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Fetches the user's upcoming flight that arrives today or tomorrow
 * so it can be linked to a ride pickup at the airport.
 */
export function useUpcomingFlightArrival() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["upcoming-flight-arrival", user?.id],
    queryFn: async (): Promise<FlightArrivalInfo | null> => {
      if (!user?.id) return null;

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 2); // Include 2-day window for timezone differences
      
      const todayStr = now.toISOString().split("T")[0];
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // Find flights arriving today or tomorrow (issued tickets only)
      const { data, error } = await supabase
        .from("flight_bookings")
        .select("id, booking_reference, pnr, origin, destination, departure_date, return_date, ticketing_status")
        .eq("customer_id", user.id)
        .eq("ticketing_status", "issued")
        .gte("departure_date", todayStr)
        .lte("departure_date", tomorrowStr)
        .order("departure_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Use PNR or booking reference as flight identifier
      const flightId = data.pnr || data.booking_reference;

      return {
        flightNumber: flightId,
        arrivalTime: data.departure_date,
        bookingId: data.id,
        origin: data.origin || "",
        destination: data.destination || "",
        bookingReference: data.booking_reference,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Build job metadata for airport pickup linked to a flight.
 * Includes auto-detection from pickup address if no flight booking found.
 */
export function buildFlightPickupJobData(
  flight: FlightArrivalInfo | null | undefined,
  pickupAddress?: string | null
) {
  // If we have a linked flight booking
  if (flight) {
    return {
      flight_number: flight.flightNumber,
      flight_arrival_time: flight.arrivalTime,
      is_airport_pickup: true,
      linked_flight_booking_id: flight.bookingId,
    };
  }

  // Auto-detect airport pickup from address keywords
  if (isAirportAddress(pickupAddress)) {
    return {
      is_airport_pickup: true,
    };
  }

  return {};
}
