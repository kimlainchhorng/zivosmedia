-- Allow authenticated users to insert their own store_profiles row.
-- Mirrors the existing owner-or-admin pattern used by the UPDATE policy,
-- so the business page wizard (self-service onboarding) can create a row
-- with owner_id = auth.uid(). Admin inserts continue to work via the
-- pre-existing "Admins can insert store_profiles" policy.

CREATE POLICY "Owners can insert their own store_profile"
  ON public.store_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));
