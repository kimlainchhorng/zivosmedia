-- Car Rental Mode Settings Table
CREATE TABLE IF NOT EXISTS public.car_rental_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'owner_listed' CHECK (mode IN ('owner_listed', 'affiliate', 'hybrid')),
  default_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  min_vehicle_year INT NOT NULL DEFAULT 2018,
  instant_book_enabled BOOLEAN NOT NULL DEFAULT true,
  require_owner_verification BOOLEAN NOT NULL DEFAULT true,
  require_renter_verification BOOLEAN NOT NULL DEFAULT true,
  insurance_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.car_rental_settings (mode, default_commission_percent, min_vehicle_year)
VALUES ('owner_listed', 20.00, 2018)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.car_rental_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for settings (needed for frontend logic)
CREATE POLICY "Anyone can read car rental settings"
ON public.car_rental_settings
FOR SELECT
USING (true);

-- Admin only for updates
CREATE POLICY "Admins can update car rental settings"
ON public.car_rental_settings
FOR UPDATE
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Vehicle Availability Calendar Table (if not exists)
CREATE TABLE IF NOT EXISTS public.vehicle_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.p2p_vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, date)
);

-- Enable RLS
ALTER TABLE public.vehicle_availability ENABLE ROW LEVEL SECURITY;

-- Owners can manage their vehicle availability
CREATE POLICY "Owners can manage their vehicle availability"
ON public.vehicle_availability
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM p2p_vehicles v
    JOIN car_owner_profiles o ON v.owner_id = o.id
    WHERE v.id = vehicle_id AND o.user_id = auth.uid()
  )
);

-- Anyone can read availability (for search)
CREATE POLICY "Anyone can read vehicle availability"
ON public.vehicle_availability
FOR SELECT
USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_availability_vehicle ON public.vehicle_availability(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_availability_date ON public.vehicle_availability(date);
CREATE INDEX IF NOT EXISTS idx_vehicle_availability_lookup ON public.vehicle_availability(vehicle_id, date, is_available);

-- Add make/model filter indexes to p2p_vehicles if not exists
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_make ON public.p2p_vehicles(make);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_model ON public.p2p_vehicles(model);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_location ON public.p2p_vehicles(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_category ON public.p2p_vehicles(category);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_search ON public.p2p_vehicles(approval_status, is_available, location_city);