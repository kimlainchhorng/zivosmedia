-- Support the zivosoftware.com public shell against the Software Supabase project.
-- These tables are read during cold boot before a user has signed in.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_global_key_idx
  ON public.app_settings (key)
  WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_tenant_key_idx
  ON public.app_settings (tenant_id, key)
  WHERE tenant_id IS NOT NULL;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_fare numeric NOT NULL DEFAULT 3.50,
  minimum_fare numeric NOT NULL DEFAULT 7.00,
  per_mile_rate numeric NOT NULL DEFAULT 1.75,
  per_minute_rate numeric NOT NULL DEFAULT 0.35,
  service_fee_flat numeric NOT NULL DEFAULT 2.50,
  service_fee_percent numeric NOT NULL DEFAULT 15.00,
  driver_payout_percent numeric NOT NULL DEFAULT 80.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_config_created_desc
  ON public.pricing_config (created_at DESC);

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  primary_color text,
  domain text UNIQUE,
  services_available text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

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
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eats_zones_code
  ON public.eats_zones (zone_code);

CREATE INDEX IF NOT EXISTS idx_eats_zones_active_city
  ON public.eats_zones (is_active, city_name);

ALTER TABLE public.eats_zones ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri text,
  violated_directive text,
  blocked_uri text,
  source_file text,
  line_number int,
  user_agent text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_directive
  ON public.csp_violations (violated_directive, created_at DESC);

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public can read app_settings'
  ) THEN
    CREATE POLICY "Public can read app_settings"
      ON public.app_settings
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pricing_config'
      AND policyname = 'Public can read pricing_config'
  ) THEN
    CREATE POLICY "Public can read pricing_config"
      ON public.pricing_config
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brands'
      AND policyname = 'Public can read brands'
  ) THEN
    CREATE POLICY "Public can read brands"
      ON public.brands
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eats_zones'
      AND policyname = 'Public can read eats_zones'
  ) THEN
    CREATE POLICY "Public can read eats_zones"
      ON public.eats_zones
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'csp_violations'
      AND policyname = 'Authenticated can read csp violations'
  ) THEN
    CREATE POLICY "Authenticated can read csp violations"
      ON public.csp_violations
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT SELECT ON public.pricing_config TO anon, authenticated;
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT SELECT ON public.eats_zones TO anon, authenticated;
GRANT SELECT ON public.csp_violations TO authenticated;

INSERT INTO public.app_settings (tenant_id, key, value, description)
VALUES
  (NULL, 'location_update_interval', '"15000"', 'Driver location update interval in milliseconds'),
  (NULL, 'push_enabled', '"true"', 'Enable push notifications'),
  (NULL, 'offline_mode_enabled', '"true"', 'Enable offline action queue'),
  (NULL, 'min_location_distance', '"20"', 'Minimum distance in meters before location update'),
  (NULL, 'min_location_time', '"10"', 'Minimum time in seconds between location updates')
ON CONFLICT DO NOTHING;

INSERT INTO public.pricing_config (
  base_fare,
  minimum_fare,
  per_mile_rate,
  per_minute_rate,
  service_fee_flat,
  service_fee_percent,
  driver_payout_percent,
  is_active
)
SELECT 3.50, 7.00, 1.75, 0.35, 2.50, 15.00, 80.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_config);

INSERT INTO public.brands (name, domain, primary_color, services_available)
VALUES
  ('ZIVO Software', 'zivosoftware.com', '#00a86b', ARRAY['software']),
  ('ZIVO Software', 'www.zivosoftware.com', '#00a86b', ARRAY['software'])
ON CONFLICT (domain) DO UPDATE
SET name = EXCLUDED.name,
    primary_color = EXCLUDED.primary_color,
    services_available = EXCLUDED.services_available;

INSERT INTO public.eats_zones (city_name, zone_code, delivery_fee_base, service_fee_percent, tax_rate)
VALUES ('Default', 'DEFAULT', 2.99, 15.00, 0.0825)
ON CONFLICT (zone_code) DO NOTHING;
