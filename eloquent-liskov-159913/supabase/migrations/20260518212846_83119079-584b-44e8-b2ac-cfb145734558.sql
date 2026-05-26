ALTER VIEW public.bots_directory SET (security_invoker = true);

ALTER FUNCTION public.bbq_generate_order_number() SET search_path = public;
ALTER FUNCTION public.bbq_set_updated_at() SET search_path = public;
ALTER FUNCTION public.deliveries_set_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_saved_collections_updated_at() SET search_path = public;