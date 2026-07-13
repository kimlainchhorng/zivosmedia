/**
 * recordSearchAttempt
 * -------------------
 * Logs a search through `travel-tracking-log`. The intent: if the user later
 * never books, we can re-engage them via email or a "Resume your search"
 * widget (see `PriceAlertsWidget`).
 *
 * Best-effort fire-and-forget — never throws, never blocks navigation.
 *
 * Schema fields:
 *   search_session_id : stable per-tab session id (sessionStorage)
 *   email             : best-effort from auth profile (if available)
 *   search_type       : "hotel" | "flight" | "ride" | "lodging" | "eats"
 *   search_params     : freeform JSON of the query (city, dates, etc.)
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "zivo_search_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export type SearchType = "hotel" | "flight" | "ride" | "lodging" | "eats";

export async function recordSearchAttempt(
  searchType: SearchType,
  searchParams: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.functions.invoke("travel-tracking-log", { body: {
      type: "abandoned_search",
      session_id: getSessionId(),
      search_type: searchType,
      search_params: searchParams,
    } });
  } catch {
    // Swallow — telemetry must never break a search.
  }
}
