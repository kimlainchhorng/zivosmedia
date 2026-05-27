-- Drop existing tables to recreate with proper schema
DROP TABLE IF EXISTS public.partner_redirect_logs CASCADE;
DROP TABLE IF EXISTS public.travel_partners CASCADE;
DROP TABLE IF EXISTS public.travel_handoff_settings CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS public.travel_partner_type CASCADE;
DROP TYPE IF EXISTS public.partner_booking_status CASCADE;

-- Create enum for partner types
CREATE TYPE public.travel_partner_type AS ENUM ('flights', 'hotels', 'cars');

-- Create enum for booking status
CREATE TYPE public.partner_booking_status AS ENUM ('pending', 'returned', 'failed', 'timeout');

-- Create travel_partners table
CREATE TABLE public.travel_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type travel_partner_type NOT NULL,
  base_url TEXT NOT NULL,
  checkout_mode TEXT NOT NULL DEFAULT 'redirect',
  tracking_params JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner_redirect_logs table
CREATE TABLE public.partner_redirect_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.travel_partners(id) ON DELETE SET NULL,
  partner_name TEXT NOT NULL,
  search_type travel_partner_type NOT NULL,
  offer_id TEXT,
  redirect_url TEXT NOT NULL,
  checkout_mode TEXT NOT NULL DEFAULT 'redirect',
  status partner_booking_status NOT NULL DEFAULT 'pending',
  booking_ref TEXT,
  itinerary_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  search_params JSONB,
  metadata JSONB,
  returned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create handoff_settings table for global configuration
CREATE TABLE public.travel_handoff_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_checkout_mode TEXT NOT NULL DEFAULT 'redirect',
  show_disclosure_modal BOOLEAN NOT NULL DEFAULT true,
  require_consent_checkbox BOOLEAN NOT NULL DEFAULT true,
  booking_timeout_seconds INTEGER NOT NULL DEFAULT 1800,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default handoff settings
INSERT INTO public.travel_handoff_settings (default_checkout_mode, show_disclosure_modal, require_consent_checkbox, booking_timeout_seconds)
VALUES ('redirect', true, true, 1800);

-- Enable RLS
ALTER TABLE public.travel_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_redirect_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_handoff_settings ENABLE ROW LEVEL SECURITY;

-- Policies for travel_partners
CREATE POLICY "Admins can manage travel partners"
ON public.travel_partners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active travel partners"
ON public.travel_partners
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policies for partner_redirect_logs
CREATE POLICY "Admins can view all redirect logs"
ON public.partner_redirect_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert redirect logs"
ON public.partner_redirect_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update redirect logs"
ON public.partner_redirect_logs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policies for handoff_settings
CREATE POLICY "Admins can manage handoff settings"
ON public.travel_handoff_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view handoff settings"
ON public.travel_handoff_settings
FOR SELECT
TO authenticated
USING (true);

-- Create indexes
CREATE INDEX idx_partner_redirect_logs_created ON public.partner_redirect_logs(created_at DESC);
CREATE INDEX idx_partner_redirect_logs_partner ON public.partner_redirect_logs(partner_id);
CREATE INDEX idx_partner_redirect_logs_type ON public.partner_redirect_logs(search_type);
CREATE INDEX idx_partner_redirect_logs_status ON public.partner_redirect_logs(status);
CREATE INDEX idx_travel_partners_type ON public.travel_partners(type);
CREATE INDEX idx_travel_partners_priority ON public.travel_partners(priority);

-- Trigger for updated_at
CREATE TRIGGER update_travel_partners_updated_at
BEFORE UPDATE ON public.travel_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default partners
INSERT INTO public.travel_partners (name, type, base_url, checkout_mode, tracking_params, priority, description) VALUES
('Searadar', 'flights', 'https://search.jetradar.com/flights', 'redirect', '{"marker": "700031", "utm_source": "zivo", "utm_medium": "affiliate"}', 100, 'Primary flight search partner via Travelpayouts'),
('Hotellook', 'hotels', 'https://search.hotellook.com', 'redirect', '{"marker": "700031", "utm_source": "zivo", "utm_medium": "affiliate"}', 100, 'Primary hotel search partner via Travelpayouts'),
('EconomyBookings', 'cars', 'https://www.economybookings.com', 'redirect', '{"utm_source": "zivo", "utm_medium": "affiliate"}', 100, 'Primary car rental partner');