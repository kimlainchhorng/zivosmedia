
-- =========================================================
-- HOTELS & RESORTS ADMIN — UPGRADE PACK (8 new tables)
-- =========================================================

-- Helper: store ownership check (uses existing store_profiles.owner_id)
CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE id = _store_id AND owner_id = _user_id
  );
$$;

-- ---------------------------------------------------------
-- 1) MEAL PLANS
-- ---------------------------------------------------------
CREATE TABLE public.lodging_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,                  -- 'BB','HB','FB','AI','RO'
  name text NOT NULL,
  description text,
  includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  hours_from time,
  hours_to time,
  price_per_guest_cents integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_meal_plans_store ON public.lodging_meal_plans(store_id);
ALTER TABLE public.lodging_meal_plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 2) EXPERIENCES
-- ---------------------------------------------------------
CREATE TABLE public.lodging_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  experience_type text NOT NULL DEFAULT 'tour', -- tour, cruise, fishing, snorkeling, island, sunset, custom
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 10,
  included jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded jsonb NOT NULL DEFAULT '[]'::jsonb,
  meeting_point text,
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_experiences_store ON public.lodging_experiences(store_id);
ALTER TABLE public.lodging_experiences ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 3) WELLNESS SERVICES
-- ---------------------------------------------------------
CREATE TABLE public.lodging_wellness_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  service_type text NOT NULL DEFAULT 'spa', -- spa, massage, yoga, sauna, gym, pool, treatment
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents integer NOT NULL DEFAULT 0,
  therapist text,
  room_location text,
  hours_from time,
  hours_to time,
  lead_time_minutes integer NOT NULL DEFAULT 60,
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_wellness_store ON public.lodging_wellness_services(store_id);
ALTER TABLE public.lodging_wellness_services ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 4) TRANSFERS
-- ---------------------------------------------------------
CREATE TABLE public.lodging_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'sedan', -- sedan, suv, van, minibus, boat, ferry, scooter, bicycle
  capacity integer NOT NULL DEFAULT 3,
  one_way_cents integer NOT NULL DEFAULT 0,
  round_trip_cents integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  notes text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_transfers_store ON public.lodging_transfers(store_id);
ALTER TABLE public.lodging_transfers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 5) PROMOTIONS
-- ---------------------------------------------------------
CREATE TABLE public.lodging_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  promo_type text NOT NULL DEFAULT 'percent', -- percent, fixed, free_night, upgrade
  discount_value numeric NOT NULL DEFAULT 0,
  rule_type text NOT NULL DEFAULT 'general', -- general, early_bird, last_minute, length_of_stay, mobile, member
  min_nights integer,
  max_nights integer,
  days_in_advance integer,
  starts_at timestamptz,
  ends_at timestamptz,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  redemptions_total integer,
  redemptions_used integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_lodging_promotions_code
  ON public.lodging_promotions(store_id, code) WHERE code IS NOT NULL;
CREATE INDEX idx_lodging_promotions_store ON public.lodging_promotions(store_id);
ALTER TABLE public.lodging_promotions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 6) TAXES & FEES
-- ---------------------------------------------------------
CREATE TABLE public.lodging_taxes_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  fee_type text NOT NULL DEFAULT 'tax', -- tax, service_charge, resort_fee, city_tax, tourism_tax
  basis text NOT NULL DEFAULT 'percent', -- percent, per_night, per_stay, per_guest, per_guest_per_night
  rate_value numeric NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'room', -- room, room_and_addons, total
  inclusive boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_taxes_store ON public.lodging_taxes_fees(store_id);
ALTER TABLE public.lodging_taxes_fees ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 7) CHANNEL CONNECTIONS (iCal sync)
-- ---------------------------------------------------------
CREATE TABLE public.lodging_channel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  room_id uuid,
  channel text NOT NULL, -- booking_com, expedia, airbnb, agoda, vrbo, custom
  display_name text,
  ical_import_url text,
  ical_export_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  last_sync_at timestamptz,
  last_sync_status text, -- ok, error, pending
  last_sync_error text,
  events_imported integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_channels_store ON public.lodging_channel_connections(store_id);
CREATE INDEX idx_lodging_channels_token ON public.lodging_channel_connections(ical_export_token);
ALTER TABLE public.lodging_channel_connections ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 8) REVIEWS
-- ---------------------------------------------------------
CREATE TABLE public.lodging_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  reservation_id uuid,
  guest_user_id uuid,
  guest_name text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness integer CHECK (cleanliness BETWEEN 1 AND 5),
  staff integer CHECK (staff BETWEEN 1 AND 5),
  location_score integer CHECK (location_score BETWEEN 1 AND 5),
  value integer CHECK (value BETWEEN 1 AND 5),
  comfort integer CHECK (comfort BETWEEN 1 AND 5),
  title text,
  body text,
  reply text,
  replied_at timestamptz,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  source text NOT NULL DEFAULT 'zivo', -- zivo, booking_com, google, manual
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_reviews_store ON public.lodging_reviews(store_id);
CREATE INDEX idx_lodging_reviews_reservation ON public.lodging_reviews(reservation_id);
ALTER TABLE public.lodging_reviews ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES (all 8 tables)
-- Pattern: store owner OR admin role can manage
-- =========================================================

-- Reviews are also publicly readable
CREATE POLICY "Public can view non-flagged reviews"
  ON public.lodging_reviews FOR SELECT
  USING (flagged = false);

-- Per-table owner/admin policies via DO block
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'lodging_meal_plans',
    'lodging_experiences',
    'lodging_wellness_services',
    'lodging_transfers',
    'lodging_promotions',
    'lodging_taxes_fees',
    'lodging_channel_connections',
    'lodging_reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($p$
      CREATE POLICY "Owners can view %1$s"
        ON public.%1$I FOR SELECT
        USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Owners can insert %1$s"
        ON public.%1$I FOR INSERT
        WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Owners can update %1$s"
        ON public.%1$I FOR UPDATE
        USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Owners can delete %1$s"
        ON public.%1$I FOR DELETE
        USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));
    $p$, t);
  END LOOP;
END $$;

-- =========================================================
-- updated_at triggers (reuses existing public.update_updated_at_column())
-- =========================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'lodging_meal_plans',
    'lodging_experiences',
    'lodging_wellness_services',
    'lodging_transfers',
    'lodging_promotions',
    'lodging_taxes_fees',
    'lodging_channel_connections',
    'lodging_reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($p$
      CREATE TRIGGER set_updated_at_%1$s
      BEFORE UPDATE ON public.%1$I
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $p$, t);
  END LOOP;
END $$;
