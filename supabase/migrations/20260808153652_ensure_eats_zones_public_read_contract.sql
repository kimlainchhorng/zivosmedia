-- Repair the main project's public Eats city lookup after schema drift.
--
-- This migration is deliberately idempotent: some environments already ran an
-- older Eats-zone migration, while others have the generated client types but
-- no exposed table at all. Keep the public read surface limited to SELECT and
-- let RLS, rather than a broad table grant, define row visibility.

CREATE TABLE IF NOT EXISTS public.eats_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  zone_code text NOT NULL UNIQUE,
  delivery_fee_base numeric(10,2) NOT NULL DEFAULT 2.99,
  delivery_fee_per_mile numeric(10,2) NOT NULL DEFAULT 0.50,
  service_fee_percent numeric(5,2) NOT NULL DEFAULT 15.00,
  small_order_fee numeric(10,2) NOT NULL DEFAULT 2.00,
  small_order_threshold numeric(10,2) NOT NULL DEFAULT 15.00,
  tax_rate numeric(5,4) NOT NULL DEFAULT 0.0825,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  city_id uuid,
  state text,
  county text,
  zip_code text,
  center_lat numeric,
  center_lng numeric,
  polygon jsonb,
  sla_prep_minutes integer DEFAULT 15,
  sla_pickup_buffer_minutes integer DEFAULT 10,
  sla_delivery_buffer_minutes integer DEFAULT 15,
  at_risk_threshold_minutes integer DEFAULT 5,
  express_enabled boolean NOT NULL DEFAULT false,
  express_fee_cents integer NOT NULL DEFAULT 0,
  express_time_reduction_percent numeric(5,2) NOT NULL DEFAULT 0,
  max_express_per_zone integer NOT NULL DEFAULT 0,
  services_enabled jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Bring older versions of the table up to the columns used by current Eats
-- clients without rewriting or deleting existing zone data.
ALTER TABLE public.eats_zones
  ADD COLUMN IF NOT EXISTS city_id uuid,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS zip_code text,
  ADD COLUMN IF NOT EXISTS center_lat numeric,
  ADD COLUMN IF NOT EXISTS center_lng numeric,
  ADD COLUMN IF NOT EXISTS polygon jsonb,
  ADD COLUMN IF NOT EXISTS sla_prep_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS sla_pickup_buffer_minutes integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sla_delivery_buffer_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS at_risk_threshold_minutes integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS express_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS express_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS express_time_reduction_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_express_per_zone integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS services_enabled jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_eats_zones_code
  ON public.eats_zones (zone_code);

CREATE INDEX IF NOT EXISTS idx_eats_zones_active_city
  ON public.eats_zones (is_active, city_name);

ALTER TABLE public.eats_zones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eats_zones'
      AND policyname = 'eats_zones_public_read'
  ) THEN
    CREATE POLICY eats_zones_public_read
      ON public.eats_zones
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;

GRANT SELECT ON TABLE public.eats_zones TO anon, authenticated;

INSERT INTO public.eats_zones (
  city_name,
  zone_code,
  delivery_fee_base,
  service_fee_percent,
  tax_rate
)
VALUES ('Default', 'DEFAULT', 2.99, 15.00, 0.0825)
ON CONFLICT (zone_code) DO NOTHING;
