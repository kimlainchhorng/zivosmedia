-- Phase 2: ZIVO Driver App Native MVP - Database Schema Updates

-- 2.1 Add Service Type Toggle Columns and Push Notification Tokens to Drivers Table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS rides_enabled boolean DEFAULT true;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS eats_enabled boolean DEFAULT true;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS move_enabled boolean DEFAULT true;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS fcm_token text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS apns_token text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS device_platform text;

-- 2.2 Add Service Type to Trips Table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'ride';
COMMENT ON COLUMN public.trips.service_type IS 'Service type: ride, eats, or move';

-- 2.3 Add Proof of Delivery Fields to Food Orders
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS delivery_photo_url text;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS delivery_pin text;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS delivery_pin_verified boolean DEFAULT false;

-- 2.4 Create Package Deliveries Table (for Move service)
CREATE TABLE IF NOT EXISTS public.package_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id),
  customer_id uuid,
  customer_name text,
  customer_phone text,
  pickup_address text NOT NULL,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  dropoff_address text NOT NULL,
  dropoff_lat double precision NOT NULL,
  dropoff_lng double precision NOT NULL,
  package_size text CHECK (package_size IN ('small', 'medium', 'large', 'extra_large')),
  package_weight decimal,
  package_contents text,
  delivery_speed text DEFAULT 'standard' CHECK (delivery_speed IN ('standard', 'express', 'priority')),
  estimated_payout decimal,
  actual_payout decimal,
  status text DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'at_pickup', 'picked_up', 'at_dropoff', 'delivered', 'cancelled')),
  pickup_photo_url text,
  delivery_photo_url text,
  signature_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);

-- Enable RLS on package_deliveries
ALTER TABLE public.package_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for package_deliveries
CREATE POLICY "Drivers can view their own package deliveries"
ON public.package_deliveries FOR SELECT
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Drivers can update their assigned package deliveries"
ON public.package_deliveries FOR UPDATE
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can create package delivery requests"
ON public.package_deliveries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all package deliveries"
ON public.package_deliveries FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_package_deliveries_driver_id ON public.package_deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_package_deliveries_status ON public.package_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_package_deliveries_created_at ON public.package_deliveries(created_at DESC);

-- Create index for service type filtering on trips
CREATE INDEX IF NOT EXISTS idx_trips_service_type ON public.trips(service_type);

-- Add driver notification log table for push notification tracking
CREATE TABLE IF NOT EXISTS public.driver_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  platform text,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  failed_at timestamptz,
  error_message text
);

-- Enable RLS on driver_notification_logs
ALTER TABLE public.driver_notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_notification_logs
CREATE POLICY "Drivers can view their own notification logs"
ON public.driver_notification_logs FOR SELECT
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all notification logs"
ON public.driver_notification_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert notification logs"
ON public.driver_notification_logs FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_driver_notification_logs_driver_id ON public.driver_notification_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_notification_logs_sent_at ON public.driver_notification_logs(sent_at DESC);