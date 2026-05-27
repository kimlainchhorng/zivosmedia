-- Create ride zones pricing table
CREATE TABLE IF NOT EXISTS public.ride_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  zone_code TEXT NOT NULL UNIQUE,
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 3.50,
  per_mile_rate DECIMAL(10,2) NOT NULL DEFAULT 1.75,
  per_minute_rate DECIMAL(10,2) NOT NULL DEFAULT 0.35,
  minimum_fare DECIMAL(10,2) NOT NULL DEFAULT 7.00,
  booking_fee DECIMAL(10,2) NOT NULL DEFAULT 2.50,
  service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  standard_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  xl_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.30,
  premium_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.60,
  surge_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create eats zones pricing table
CREATE TABLE IF NOT EXISTS public.eats_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  zone_code TEXT NOT NULL UNIQUE,
  delivery_fee_base DECIMAL(10,2) NOT NULL DEFAULT 2.99,
  delivery_fee_per_mile DECIMAL(10,2) NOT NULL DEFAULT 0.50,
  service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  small_order_fee DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  small_order_threshold DECIMAL(10,2) NOT NULL DEFAULT 15.00,
  tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0825,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eats_zones ENABLE ROW LEVEL SECURITY;

-- Anyone can read zones
CREATE POLICY "Anyone can read ride zones" ON public.ride_zones FOR SELECT USING (true);
CREATE POLICY "Anyone can read eats zones" ON public.eats_zones FOR SELECT USING (true);

-- Admins can manage zones
CREATE POLICY "Admins can manage ride zones" ON public.ride_zones FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage eats zones" ON public.eats_zones FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default zones
INSERT INTO public.ride_zones (city_name, zone_code, base_fare, per_mile_rate, per_minute_rate, minimum_fare, booking_fee)
VALUES 
  ('New York', 'NYC', 3.50, 2.00, 0.40, 8.00, 2.50),
  ('Los Angeles', 'LAX', 3.00, 1.75, 0.35, 7.00, 2.50),
  ('Chicago', 'CHI', 3.25, 1.80, 0.35, 7.50, 2.50),
  ('Miami', 'MIA', 3.00, 1.65, 0.30, 6.50, 2.50),
  ('San Francisco', 'SFO', 4.00, 2.25, 0.45, 9.00, 2.75),
  ('Default', 'DEFAULT', 3.50, 1.75, 0.35, 7.00, 2.50)
ON CONFLICT (zone_code) DO NOTHING;

INSERT INTO public.eats_zones (city_name, zone_code, delivery_fee_base, service_fee_percent, tax_rate)
VALUES 
  ('New York', 'NYC', 3.99, 15.00, 0.0875),
  ('Los Angeles', 'LAX', 2.99, 15.00, 0.0950),
  ('Chicago', 'CHI', 2.99, 15.00, 0.1025),
  ('Miami', 'MIA', 2.49, 15.00, 0.0700),
  ('San Francisco', 'SFO', 3.99, 15.00, 0.0875),
  ('Default', 'DEFAULT', 2.99, 15.00, 0.0825)
ON CONFLICT (zone_code) DO NOTHING;

-- Add quoted_price fields to ride_requests if not exists
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS quoted_base_fare DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_distance_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_time_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_booking_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_service_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS quoted_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_price_override DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_override_reason TEXT,
ADD COLUMN IF NOT EXISTS zone_code TEXT;

-- Add quoted fields to food_orders if not exists
ALTER TABLE public.food_orders
ADD COLUMN IF NOT EXISTS quoted_subtotal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_delivery_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_service_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_small_order_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_tax DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_tip DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS quoted_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_price_override DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS admin_override_reason TEXT,
ADD COLUMN IF NOT EXISTS zone_code TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ride_zones_code ON public.ride_zones(zone_code);
CREATE INDEX IF NOT EXISTS idx_eats_zones_code ON public.eats_zones(zone_code);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS trigger_ride_zones_updated_at ON public.ride_zones;
CREATE TRIGGER trigger_ride_zones_updated_at
  BEFORE UPDATE ON public.ride_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_eats_zones_updated_at ON public.eats_zones;
CREATE TRIGGER trigger_eats_zones_updated_at
  BEFORE UPDATE ON public.eats_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();