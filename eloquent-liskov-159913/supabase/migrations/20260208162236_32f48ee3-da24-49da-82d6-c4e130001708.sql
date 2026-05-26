-- Create pricing multiplier tables for unified pricing engine

-- 1) Time-of-day multipliers per zone
CREATE TABLE IF NOT EXISTS public.time_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.pricing_zones(id) ON DELETE CASCADE,
  day_mask int DEFAULT 127, -- 7-bit mask Sun..Sat (127 = all days)
  start_hour int NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour int NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  multiplier numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(zone_id, day_mask, start_hour, end_hour)
);

-- 2) Weather-based multipliers (global or zone-specific)
CREATE TABLE IF NOT EXISTS public.weather_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.pricing_zones(id) ON DELETE CASCADE,
  weather_key text NOT NULL, -- clear, rain, heavy_rain, snow
  multiplier numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(zone_id, weather_key)
);

-- 3) Event zones (stadium/concert surge areas)
CREATE TABLE IF NOT EXISTS public.event_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone_id uuid REFERENCES public.pricing_zones(id) ON DELETE CASCADE,
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  radius_km numeric DEFAULT 3,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  multiplier numeric DEFAULT 1.15,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4) Ride quotes audit log
CREATE TABLE IF NOT EXISTS public.ride_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  pickup_lat numeric,
  pickup_lng numeric,
  dest_lat numeric,
  dest_lng numeric,
  ride_type text,
  miles numeric,
  minutes numeric,
  subtotal numeric,
  multipliers jsonb,
  insurance_fee numeric,
  tolls_fee numeric DEFAULT 0,
  final_price numeric,
  zone_name text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_multipliers_zone ON public.time_multipliers(zone_id);
CREATE INDEX IF NOT EXISTS idx_weather_multipliers_zone ON public.weather_multipliers(zone_id);
CREATE INDEX IF NOT EXISTS idx_event_zones_active ON public.event_zones(is_active, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_ride_quotes_created ON public.ride_quotes(created_at DESC);

-- Enable RLS
ALTER TABLE public.time_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read access for all (pricing data is public)
CREATE POLICY "Anyone can read time_multipliers" ON public.time_multipliers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read weather_multipliers" ON public.weather_multipliers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read event_zones" ON public.event_zones
  FOR SELECT USING (true);

CREATE POLICY "Users can read own ride_quotes" ON public.ride_quotes
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert ride_quotes" ON public.ride_quotes
  FOR INSERT WITH CHECK (true);

-- Admin policies using user_roles table
CREATE POLICY "Admins can manage time_multipliers" ON public.time_multipliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage weather_multipliers" ON public.weather_multipliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage event_zones" ON public.event_zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Seed USA Default zone time multipliers
WITH z AS (
  SELECT id AS zone_id FROM public.pricing_zones WHERE name = 'USA Default Pricing' LIMIT 1
)
INSERT INTO public.time_multipliers (zone_id, day_mask, start_hour, end_hour, multiplier)
SELECT zone_id, 127, 6, 10, 1.05 FROM z   -- Morning rush
UNION ALL SELECT zone_id, 127, 10, 16, 1.00 FROM z   -- Midday
UNION ALL SELECT zone_id, 127, 16, 20, 1.10 FROM z   -- Evening rush
UNION ALL SELECT zone_id, 127, 20, 2, 1.15 FROM z    -- Late night
UNION ALL SELECT zone_id, 127, 2, 6, 1.05 FROM z     -- Early morning
ON CONFLICT DO NOTHING;

-- Seed global weather multipliers (zone_id = NULL for global)
INSERT INTO public.weather_multipliers (zone_id, weather_key, multiplier)
VALUES
  (NULL, 'clear', 1.00),
  (NULL, 'rain', 1.10),
  (NULL, 'heavy_rain', 1.20),
  (NULL, 'snow', 1.25)
ON CONFLICT DO NOTHING;