-- 1) Extend lodge_rooms
ALTER TABLE public.lodge_rooms
  ADD COLUMN IF NOT EXISTS bed_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS view text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS wing text,
  ADD COLUMN IF NOT EXISTS child_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fees jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seasonal_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS min_stay integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_stay integer,
  ADD COLUMN IF NOT EXISTS no_arrival_weekdays integer[] NOT NULL DEFAULT '{}'::integer[];

-- 2) Extend lodge_reservations
ALTER TABLE public.lodge_reservations
  ADD COLUMN IF NOT EXISTS guest_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS addon_selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fee_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) Create lodge_property_profile
CREATE TABLE IF NOT EXISTS public.lodge_property_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL UNIQUE,
  languages text[] NOT NULL DEFAULT '{}'::text[],
  facilities text[] NOT NULL DEFAULT '{}'::text[],
  meal_plans text[] NOT NULL DEFAULT '{}'::text[],
  house_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  accessibility text[] NOT NULL DEFAULT '{}'::text[],
  sustainability text[] NOT NULL DEFAULT '{}'::text[],
  hero_badges text[] NOT NULL DEFAULT '{}'::text[],
  included_highlights text[] NOT NULL DEFAULT '{}'::text[],
  nearby jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lodge_property_profile ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "Lodge profile public read" ON public.lodge_property_profile;
CREATE POLICY "Lodge profile public read"
  ON public.lodge_property_profile
  FOR SELECT
  USING (true);

-- Owner / admin write
DROP POLICY IF EXISTS "Lodge profile owner insert" ON public.lodge_property_profile;
CREATE POLICY "Lodge profile owner insert"
  ON public.lodge_property_profile
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = lodge_property_profile.store_id
        AND r.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Lodge profile owner update" ON public.lodge_property_profile;
CREATE POLICY "Lodge profile owner update"
  ON public.lodge_property_profile
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = lodge_property_profile.store_id
        AND r.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Lodge profile owner delete" ON public.lodge_property_profile;
CREATE POLICY "Lodge profile owner delete"
  ON public.lodge_property_profile
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = lodge_property_profile.store_id
        AND r.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS update_lodge_property_profile_updated_at ON public.lodge_property_profile;
CREATE TRIGGER update_lodge_property_profile_updated_at
  BEFORE UPDATE ON public.lodge_property_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();