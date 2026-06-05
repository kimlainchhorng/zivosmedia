import { createClient } from "@supabase/supabase-js";
import {
  ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_TRAVEL_SUPABASE_URL,
} from "@/config/zivoTravelDomain";

export const zivoTravelSupabase = createClient(
  ZIVO_TRAVEL_SUPABASE_URL,
  ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
