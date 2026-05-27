-- =========================================================
-- 1. Fix RLS on lodge_property_profile (use store_profiles, not restaurants)
-- =========================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.lodge_property_profile'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lodge_property_profile', pol.polname);
  END LOOP;
END $$;

ALTER TABLE public.lodge_property_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read lodge property profile"
ON public.lodge_property_profile
FOR SELECT
USING (true);

CREATE POLICY "Owners and admins manage lodge property profile"
ON public.lodge_property_profile
FOR ALL
USING (public.is_lodge_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_lodge_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. Audit & repair sibling lodge_* tables that reference restaurants
-- =========================================================
DO $$
DECLARE
  t text;
  pol record;
  has_restaurants boolean;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lodge_rooms','lodge_reservations','lodge_room_blocks','lodge_guests',
    'lodge_housekeeping','lodge_maintenance','lodge_reservation_audit','lodge_reservation_charges'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=t
    ) THEN
      CONTINUE;
    END IF;

    FOR pol IN
      SELECT polname,
             pg_get_expr(polqual, polrelid)     AS qual_expr,
             pg_get_expr(polwithcheck, polrelid) AS check_expr
      FROM pg_policy
      WHERE polrelid = ('public.' || t)::regclass
    LOOP
      has_restaurants := COALESCE(pol.qual_expr, '') ILIKE '%restaurants%'
                      OR COALESCE(pol.check_expr, '') ILIKE '%restaurants%';
      IF has_restaurants THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
      END IF;
    END LOOP;

    policy_name := 'Owners and admins manage ' || t;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = ('public.' || t)::regclass
        AND polname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_lodge_store_owner(store_id) OR public.has_role(auth.uid(), %L)) WITH CHECK (public.is_lodge_store_owner(store_id) OR public.has_role(auth.uid(), %L))',
        policy_name, t, 'admin', 'admin'
      );
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- 3. Extend lodge_amenities with categorized catalog columns
-- =========================================================
ALTER TABLE public.lodge_amenities
  ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_charge_keys text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS parking_mode text,
  ADD COLUMN IF NOT EXISTS internet_mode text;

-- =========================================================
-- 4. Guest-reported missing-amenity feedback
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lodge_amenity_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  message text,
  helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lodge_amenity_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit amenity feedback" ON public.lodge_amenity_feedback;
CREATE POLICY "Anyone can submit amenity feedback"
ON public.lodge_amenity_feedback
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read amenity feedback" ON public.lodge_amenity_feedback;
CREATE POLICY "Admins read amenity feedback"
ON public.lodge_amenity_feedback
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owners read their amenity feedback" ON public.lodge_amenity_feedback;
CREATE POLICY "Owners read their amenity feedback"
ON public.lodge_amenity_feedback
FOR SELECT
USING (public.is_lodge_store_owner(store_id));

CREATE INDEX IF NOT EXISTS idx_lodge_amenity_feedback_store ON public.lodge_amenity_feedback(store_id, created_at DESC);
