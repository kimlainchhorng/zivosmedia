-- Consolidate the five (table, role, action) pairs flagged by the Supabase
-- performance advisor as multiple_permissive_policies. Each merge is purely
-- additive in terms of predicate semantics: the new single policy permits
-- exactly the same set of rows the prior two policies did, just in one
-- evaluation pass instead of two.

-- ─── car_dealership_leads · INSERT ────────────────────────────────────────────
DROP POLICY IF EXISTS "Owners manage car_dealership_leads - insert"
  ON public.car_dealership_leads;
DROP POLICY IF EXISTS "Public can create dealership leads"
  ON public.car_dealership_leads;

CREATE POLICY "car_dealership_leads_insert_combined"
  ON public.car_dealership_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (source = ANY (ARRAY['web'::text, 'phone'::text]))
    OR (EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = car_dealership_leads.store_id
        AND sp.owner_id = (SELECT auth.uid())
    ))
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

-- ─── car_dealership_promotions · SELECT ───────────────────────────────────────
DROP POLICY IF EXISTS cd_promos_owner_select ON public.car_dealership_promotions;
DROP POLICY IF EXISTS cd_promos_public_read   ON public.car_dealership_promotions;

CREATE POLICY "car_dealership_promotions_select_combined"
  ON public.car_dealership_promotions
  FOR SELECT
  TO anon, authenticated
  USING (
    (is_active = true)
    OR (EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = car_dealership_promotions.store_id
        AND sp.owner_id = (SELECT auth.uid())
    ))
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

-- ─── car_dealership_reviews · INSERT ─────────────────────────────────────────
DROP POLICY IF EXISTS "Owners manage car_dealership_reviews - insert"
  ON public.car_dealership_reviews;
DROP POLICY IF EXISTS "Public submit dealership review"
  ON public.car_dealership_reviews;

CREATE POLICY "car_dealership_reviews_insert_combined"
  ON public.car_dealership_reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Public path: tied to a real completed/delivered sale, must start hidden.
    (
      (sale_id IS NOT NULL)
      AND (is_visible = false)
      AND (EXISTS (
        SELECT 1 FROM public.car_dealership_sales s
        WHERE s.id = car_dealership_reviews.sale_id
          AND s.store_id = car_dealership_reviews.store_id
          AND s.status = ANY (ARRAY[
            'completed'::car_dealership_sale_status,
            'delivered'::car_dealership_sale_status
          ])
      ))
    )
    -- Owner / admin path
    OR (EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = car_dealership_reviews.store_id
        AND sp.owner_id = (SELECT auth.uid())
    ))
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

-- ─── car_dealership_reviews · SELECT ─────────────────────────────────────────
DROP POLICY IF EXISTS "Owners manage car_dealership_reviews - select"
  ON public.car_dealership_reviews;
DROP POLICY IF EXISTS "Public read dealership reviews"
  ON public.car_dealership_reviews;

CREATE POLICY "car_dealership_reviews_select_combined"
  ON public.car_dealership_reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    (is_visible = true)
    OR (EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = car_dealership_reviews.store_id
        AND sp.owner_id = (SELECT auth.uid())
    ))
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );

-- ─── car_dealership_vehicles · SELECT ────────────────────────────────────────
DROP POLICY IF EXISTS "Owners manage car_dealership_vehicles - select"
  ON public.car_dealership_vehicles;
DROP POLICY IF EXISTS "Public read active dealership vehicles"
  ON public.car_dealership_vehicles;

CREATE POLICY "car_dealership_vehicles_select_combined"
  ON public.car_dealership_vehicles
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      (is_active = true)
      AND (status <> 'retired'::car_dealership_vehicle_status)
    )
    OR (EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = car_dealership_vehicles.store_id
        AND sp.owner_id = (SELECT auth.uid())
    ))
    OR public.has_role((SELECT auth.uid()), 'admin'::text)
  );
