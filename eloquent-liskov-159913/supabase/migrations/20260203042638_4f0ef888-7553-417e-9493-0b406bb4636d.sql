-- ========================================
-- Car Rental Level 3: Pricing Engine & Revenue
-- ========================================

-- Add dynamic pricing fields to p2p_vehicles
ALTER TABLE public.p2p_vehicles
ADD COLUMN IF NOT EXISTS base_daily_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weekend_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weekly_discount_percent INTEGER DEFAULT 0 CHECK (weekly_discount_percent >= 0 AND weekly_discount_percent <= 50),
ADD COLUMN IF NOT EXISTS monthly_discount_percent INTEGER DEFAULT 0 CHECK (monthly_discount_percent >= 0 AND monthly_discount_percent <= 50),
ADD COLUMN IF NOT EXISTS min_rental_days INTEGER DEFAULT 1 CHECK (min_rental_days >= 1),
ADD COLUMN IF NOT EXISTS max_rental_days INTEGER DEFAULT 90 CHECK (max_rental_days >= 1),
ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_mileage_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_return_fee_per_hour DECIMAL(10,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS included_miles_per_day INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_until TIMESTAMP WITH TIME ZONE;

-- Sync base_daily_rate with daily_rate where null
UPDATE public.p2p_vehicles 
SET base_daily_rate = daily_rate 
WHERE base_daily_rate IS NULL AND daily_rate IS NOT NULL;

-- Create seasonal pricing table
CREATE TABLE IF NOT EXISTS public.vehicle_seasonal_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.p2p_vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Enable RLS
ALTER TABLE public.vehicle_seasonal_pricing ENABLE ROW LEVEL SECURITY;

-- Owners can manage their vehicle seasonal pricing
CREATE POLICY "Owners can manage their vehicle seasonal pricing"
ON public.vehicle_seasonal_pricing
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM p2p_vehicles v
    JOIN car_owner_profiles cop ON v.owner_id = cop.id
    WHERE v.id = vehicle_id AND cop.user_id = auth.uid()
  )
);

-- Public can view active seasonal pricing
CREATE POLICY "Public can view active seasonal pricing"
ON public.vehicle_seasonal_pricing
FOR SELECT
USING (is_active = true);

-- Add custom commission rate per vehicle (overrides default)
ALTER TABLE public.p2p_vehicles
ADD COLUMN IF NOT EXISTS custom_commission_percent DECIMAL(5,2);

-- Add custom commission rate per owner
ALTER TABLE public.car_owner_profiles
ADD COLUMN IF NOT EXISTS custom_commission_percent DECIMAL(5,2);

-- Add fee breakdown to bookings
ALTER TABLE public.p2p_bookings
ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS mileage_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS is_long_term BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_schedule TEXT DEFAULT 'single' CHECK (payout_schedule IN ('single', 'weekly', 'monthly'));

-- Add vehicle stats for sorting/boosting
CREATE TABLE IF NOT EXISTS public.vehicle_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.p2p_vehicles(id) ON DELETE CASCADE UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  response_rate DECIMAL(5,2),
  booking_rate DECIMAL(5,2),
  occupancy_rate DECIMAL(5,2),
  last_booked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_stats ENABLE ROW LEVEL SECURITY;

-- Public can view stats
CREATE POLICY "Public can view vehicle stats"
ON public.vehicle_stats
FOR SELECT
USING (true);

-- Admins can manage stats
CREATE POLICY "Admins can manage vehicle stats"
ON public.vehicle_stats
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_seasonal_pricing_vehicle ON public.vehicle_seasonal_pricing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_seasonal_pricing_dates ON public.vehicle_seasonal_pricing(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_featured ON public.p2p_vehicles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_boost ON public.p2p_vehicles(boost_until) WHERE boost_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_stats_rating ON public.vehicle_stats(average_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_vehicle_stats_bookings ON public.vehicle_stats(total_bookings DESC);