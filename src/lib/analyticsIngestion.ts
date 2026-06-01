import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventPayload = {
  event_name: string;
  session_id?: string | null;
  page?: string | null;
  meta?: Record<string, unknown>;
  order_id?: string | null;
  value?: number | null;
  device_type?: string | null;
  traffic_source?: string | null;
  is_new_user?: boolean | null;
  country?: string | null;
  created_at?: string;
};

// The production Supabase project is at its Edge Function count cap, so generic
// browser analytics piggybacks on the already-deployed ads tracking route.
export const ANALYTICS_EVENT_FUNCTION = "ads-studio-track";
export const LEGACY_ANALYTICS_EVENT_FUNCTION = "analytics-event-track";

export function invokeAnalyticsEvent(payload: AnalyticsEventPayload) {
  return supabase.functions.invoke(ANALYTICS_EVENT_FUNCTION, { body: payload });
}
