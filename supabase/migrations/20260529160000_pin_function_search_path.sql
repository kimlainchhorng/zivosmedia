-- Security hardening: pin search_path on app functions flagged by the Supabase
-- advisor ("function_search_path_mutable"). A mutable search_path can let a
-- caller shadow built-in/table references; pinning it closes that vector.
-- All 8 are SECURITY INVOKER and reference public objects, so `public, pg_temp`
-- preserves behavior while making the path immutable.

ALTER FUNCTION public.cafe_bundle_window_active(time without time zone, time without time zone, timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.cafe_bundles_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cafe_customer_notes_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cafe_menu_item_happy_hour_active(integer, smallint, smallint, timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.cafe_reservations_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cafe_settings_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cafe_till_sessions_touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.enqueue_notification(uuid, text, text, text, jsonb, text[], text, text) SET search_path = public, pg_temp;
