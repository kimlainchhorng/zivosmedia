-- is_store_owner() only checked the legacy `restaurants` table, but stores now
-- live in `store_profiles`, so it always returned false for store owners —
-- silently blocking RLS on every table that gates writes through it (e.g.
-- marketing_templates, where the template library could never be populated).
-- Recognize store_profiles ownership too. Additive: only grants access to
-- genuine owners; UUID ids never false-match across tables.
CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = _store_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.store_profiles WHERE id = _store_id AND owner_id = auth.uid()
  );
$function$;
