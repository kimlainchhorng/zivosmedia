-- Create ride_requests table with payment fields
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,6),
  pickup_lng DECIMAL(10,6),
  dropoff_address TEXT NOT NULL,
  dropoff_lat DECIMAL(10,6),
  dropoff_lng DECIMAL(10,6),
  ride_type TEXT NOT NULL DEFAULT 'standard',
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_driver_id UUID REFERENCES public.drivers(id),
  admin_notes TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  payment_amount DECIMAL(10,2),
  payment_currency TEXT DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  refund_status TEXT,
  refunded_at TIMESTAMPTZ,
  estimated_fare_min DECIMAL(10,2),
  estimated_fare_max DECIMAL(10,2),
  distance_miles DECIMAL(10,2),
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Allow public to insert ride requests (for guests)
CREATE POLICY "Anyone can create ride requests"
ON public.ride_requests
FOR INSERT
WITH CHECK (true);

-- Allow public to read ride requests (for status updates after payment)
CREATE POLICY "Anyone can read ride requests"
ON public.ride_requests
FOR SELECT
USING (true);

-- Admins can update ride requests (using user_roles table)
CREATE POLICY "Admins can update ride requests"
ON public.ride_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_type, setting_key)
);

-- Enable RLS on pricing_settings
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pricing settings
CREATE POLICY "Anyone can read pricing settings"
ON public.pricing_settings
FOR SELECT
USING (true);

-- Allow admins to manage pricing settings
CREATE POLICY "Admins can manage pricing settings"
ON public.pricing_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Insert default pricing settings
INSERT INTO public.pricing_settings (service_type, setting_key, setting_value, description)
VALUES 
  ('rides', 'base_fare', 3.50, 'Base fare for all rides'),
  ('rides', 'per_mile_rate', 1.75, 'Rate per mile'),
  ('rides', 'per_minute_rate', 0.35, 'Rate per minute'),
  ('rides', 'minimum_fare', 7.00, 'Minimum fare for any ride'),
  ('rides', 'standard_multiplier', 1.00, 'Standard ride type multiplier'),
  ('rides', 'xl_multiplier', 1.30, 'XL ride type multiplier'),
  ('rides', 'premium_multiplier', 1.60, 'Premium ride type multiplier'),
  ('rides', 'booking_fee', 2.50, 'Booking/service fee'),
  ('eats', 'delivery_fee_base', 2.99, 'Base delivery fee'),
  ('eats', 'delivery_fee_per_mile', 0.50, 'Additional fee per mile'),
  ('eats', 'service_fee_percent', 15.00, 'Service fee percentage'),
  ('eats', 'minimum_order', 10.00, 'Minimum order amount'),
  ('eats', 'tax_rate', 8.25, 'Tax rate percentage')
ON CONFLICT (service_type, setting_key) DO NOTHING;

-- Add payment fields to food_orders if not exists (most already exist)
ALTER TABLE public.food_orders 
ADD COLUMN IF NOT EXISTS refund_status TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for ride_requests
DROP TRIGGER IF EXISTS trigger_ride_requests_updated_at ON public.ride_requests;
CREATE TRIGGER trigger_ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_ride_requests_stripe_session ON public.ride_requests(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_stripe_payment ON public.ride_requests(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_food_orders_stripe_session ON public.food_orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_stripe_payment ON public.food_orders(stripe_payment_id);