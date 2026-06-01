-- Store profile mutations control shop identity, ownership, active state, and
-- public routing. Keep public/owner/admin reads, but require trusted Edge
-- Functions for insert/update/delete mutations.

ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can insert their own store_profile" ON public.store_profiles;
DROP POLICY IF EXISTS "Store owners can update their store" ON public.store_profiles;
DROP POLICY IF EXISTS "Admins can insert store_profiles" ON public.store_profiles;
DROP POLICY IF EXISTS "Admins can update store_profiles" ON public.store_profiles;
DROP POLICY IF EXISTS "Admins can delete store_profiles" ON public.store_profiles;
DROP POLICY IF EXISTS "Store profile inserts require trusted server-side validation" ON public.store_profiles;
DROP POLICY IF EXISTS "Store profile updates require trusted server-side validation" ON public.store_profiles;
DROP POLICY IF EXISTS "Store profile deletes require trusted server-side validation" ON public.store_profiles;

CREATE POLICY "Store profile inserts require trusted server-side validation"
  ON public.store_profiles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store profile updates require trusted server-side validation"
  ON public.store_profiles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store profile deletes require trusted server-side validation"
  ON public.store_profiles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_profiles FROM authenticated;
GRANT SELECT ON TABLE public.store_profiles TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_profiles TO service_role;

COMMENT ON TABLE public.store_profiles IS
  'Public store profile identity. Client reads are allowed by RLS; mutations are routed through store-profile-manage for trusted server-side validation.';
