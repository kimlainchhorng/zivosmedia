
-- Scheduled bookings table (replaces localStorage approach)
CREATE TABLE public.scheduled_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('ride', 'eats', 'delivery')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_address TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  estimated_price NUMERIC(10,2),
  details JSONB DEFAULT '{}'::jsonb,
  driver_id UUID REFERENCES public.drivers(id),
  restaurant_id UUID,
  cancellation_reason TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  driver_assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_scheduled_bookings_user ON public.scheduled_bookings(user_id, status);
CREATE INDEX idx_scheduled_bookings_date ON public.scheduled_bookings(scheduled_date, scheduled_time) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_bookings_driver ON public.scheduled_bookings(driver_id) WHERE driver_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.scheduled_bookings ENABLE ROW LEVEL SECURITY;

-- Customers see own bookings
CREATE POLICY "Users can view own scheduled bookings"
  ON public.scheduled_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled bookings"
  ON public.scheduled_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled bookings"
  ON public.scheduled_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Drivers can see bookings assigned to them
CREATE POLICY "Drivers can view assigned bookings"
  ON public.scheduled_bookings FOR SELECT
  TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Admins can view all
CREATE POLICY "Admins can view all scheduled bookings"
  ON public.scheduled_bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all scheduled bookings"
  ON public.scheduled_bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.scheduled_bookings TO authenticated;

-- Auto-update updated_at
CREATE TRIGGER update_scheduled_bookings_updated_at
  BEFORE UPDATE ON public.scheduled_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Admin scheduling config
INSERT INTO public.pricing_settings (service_type, setting_key, setting_value, description)
VALUES
  ('scheduling', 'min_advance_minutes', 60, 'Minimum advance time for scheduling (minutes)'),
  ('scheduling', 'max_advance_days', 30, 'Maximum days in advance for scheduling'),
  ('scheduling', 'cancellation_deadline_minutes', 30, 'Free cancellation deadline before scheduled time (minutes)'),
  ('scheduling', 'reminder_minutes_before', 60, 'Send reminder this many minutes before scheduled time')
ON CONFLICT DO NOTHING;
