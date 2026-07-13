-- ========================================
-- Car Rental Level 4: Vehicle Delivery & Pickup
-- ========================================

-- Add delivery settings to p2p_vehicles
ALTER TABLE public.p2p_vehicles
ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_delivery_distance_miles INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS delivery_fee_type TEXT DEFAULT 'flat' CHECK (delivery_fee_type IN ('flat', 'per_mile')),
ADD COLUMN IF NOT EXISTS delivery_base_fee DECIMAL(10,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS delivery_per_mile_fee DECIMAL(10,2) DEFAULT 1.50,
ADD COLUMN IF NOT EXISTS delivery_hours_start TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS delivery_hours_end TIME DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pickup_fee_type TEXT DEFAULT 'flat' CHECK (pickup_fee_type IN ('flat', 'per_mile')),
ADD COLUMN IF NOT EXISTS pickup_base_fee DECIMAL(10,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS pickup_per_mile_fee DECIMAL(10,2) DEFAULT 1.50;

-- Add delivery fields to p2p_bookings
ALTER TABLE public.p2p_bookings
ADD COLUMN IF NOT EXISTS delivery_option TEXT DEFAULT 'self_pickup' CHECK (delivery_option IN ('self_pickup', 'delivery', 'delivery_and_pickup')),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_lat DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS delivery_lng DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS delivery_distance_miles DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Create vehicle delivery tasks table
CREATE TABLE IF NOT EXISTS public.vehicle_delivery_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.p2p_bookings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('delivery', 'pickup')),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  
  -- Location info
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),
  distance_miles DECIMAL(10,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'accepted', 'en_route', 'arrived', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Handoff verification
  vehicle_photos JSONB DEFAULT '[]'::jsonb,
  condition_notes TEXT,
  handoff_pin TEXT,
  handoff_verified BOOLEAN DEFAULT false,
  handoff_signature_url TEXT,
  handoff_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  total_fee DECIMAL(10,2) NOT NULL,
  driver_payout DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_delivery_tasks ENABLE ROW LEVEL SECURITY;

-- Owners can view their delivery tasks
CREATE POLICY "Owners can view their vehicle delivery tasks"
ON public.vehicle_delivery_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM p2p_bookings b
    JOIN car_owner_profiles cop ON b.owner_id = cop.id
    WHERE b.id = booking_id AND cop.user_id = auth.uid()
  )
);

-- Renters can view their delivery tasks
CREATE POLICY "Renters can view their delivery tasks"
ON public.vehicle_delivery_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM p2p_bookings b
    WHERE b.id = booking_id AND b.renter_id = auth.uid()
  )
);

-- Drivers can manage assigned tasks
CREATE POLICY "Drivers can manage assigned tasks"
ON public.vehicle_delivery_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = driver_id AND d.user_id = auth.uid()
  )
);

-- Admins can manage all tasks
CREATE POLICY "Admins can manage all delivery tasks"
ON public.vehicle_delivery_tasks
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_tasks_booking ON public.vehicle_delivery_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_tasks_driver ON public.vehicle_delivery_tasks(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_tasks_status ON public.vehicle_delivery_tasks(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_tasks_scheduled ON public.vehicle_delivery_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_delivery_enabled ON public.p2p_vehicles(delivery_enabled) WHERE delivery_enabled = true;