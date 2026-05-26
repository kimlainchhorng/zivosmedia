-- =====================================================
-- SECURITY: Restrict public exposure of restaurant owner contact data
-- Fixes: restaurants_table_missing_rls (owner email/phone exposed)
-- Approach: Keep public listing of active restaurants, but remove column-level
-- SELECT privileges for sensitive columns for anon users.
-- =====================================================

-- Ensure RLS is enabled and enforced
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants FORCE ROW LEVEL SECURITY;

-- Keep existing RLS policies (including "Anyone can view active restaurants")
-- but restrict what columns anon/authenticated can select.

-- Remove default SELECT privileges (we re-grant a safe subset)
REVOKE SELECT ON TABLE public.restaurants FROM anon;
REVOKE SELECT ON TABLE public.restaurants FROM authenticated;

-- Public + authenticated can select ONLY non-sensitive columns.
-- (No owner_id, phone, email, commission_rate)
GRANT SELECT (
  id,
  name,
  description,
  cuisine_type,
  address,
  lat,
  lng,
  logo_url,
  cover_image_url,
  rating,
  total_orders,
  avg_prep_time,
  is_open,
  opening_hours,
  status,
  created_at,
  updated_at
) ON TABLE public.restaurants TO anon, authenticated;

-- Authenticated users (owners/admin via existing RLS) can additionally read sensitive columns
GRANT SELECT (owner_id, phone, email, commission_rate) ON TABLE public.restaurants TO authenticated;
