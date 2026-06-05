import { createClient } from "@supabase/supabase-js";
import {
  ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_TRAVEL_SUPABASE_URL,
} from "@/config/zivoTravelDomain";

export type ZivoTravelSearchEvent = {
  session_id: string;
  service_type: "flight" | "hotel" | "rental_car" | "bus";
  origin: string | null;
  destination: string | null;
  pickup: string | null;
  dropoff: string | null;
  date_start: string | null;
  date_end: string | null;
  travelers: number;
  rooms: number | null;
  source_host: string;
  filters: Record<string, unknown>;
};

export const isZivoTravelTelemetryConfigured = Boolean(
  ZIVO_TRAVEL_SUPABASE_URL && ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
);

export const zivoTravelSupabase = isZivoTravelTelemetryConfigured
  ? createClient(
      ZIVO_TRAVEL_SUPABASE_URL,
      ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
  : null;

export async function recordZivoTravelSearchEvent(payload: ZivoTravelSearchEvent) {
  if (!zivoTravelSupabase) return;

  const { error } = await zivoTravelSupabase
    .from("zivo_travel_search_events")
    .insert(payload);

  if (error) {
    console.warn("[zivo-travel] search event skipped", error.message);
  }
}
