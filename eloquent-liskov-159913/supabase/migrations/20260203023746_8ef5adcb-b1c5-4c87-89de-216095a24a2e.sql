-- Create flights_launch_settings table for TEST/LIVE switch
CREATE TABLE public.flights_launch_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'test' CHECK (status IN ('test', 'live')),
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID REFERENCES auth.users(id),
  
  -- Pre-launch checklist
  seller_of_travel_verified BOOLEAN DEFAULT false,
  terms_privacy_linked BOOLEAN DEFAULT false,
  support_email_configured BOOLEAN DEFAULT false,
  stripe_live_enabled BOOLEAN DEFAULT false,
  duffel_live_configured BOOLEAN DEFAULT false,
  
  -- Post-launch tracking
  first_booking_at TIMESTAMPTZ,
  first_ticket_issued_at TIMESTAMPTZ,
  first_failure_at TIMESTAMPTZ,
  
  -- Emergency controls
  emergency_pause BOOLEAN DEFAULT false,
  emergency_pause_reason TEXT,
  emergency_pause_at TIMESTAMPTZ,
  emergency_pause_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flights_launch_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (needed for canBook check)
CREATE POLICY "Anyone can read flight launch settings"
ON public.flights_launch_settings FOR SELECT TO authenticated
USING (true);

-- Allow admins to update
CREATE POLICY "Admins can update flight launch settings"
ON public.flights_launch_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_flights_launch_settings_updated_at
BEFORE UPDATE ON public.flights_launch_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row with TEST status
INSERT INTO public.flights_launch_settings (id) VALUES (gen_random_uuid());