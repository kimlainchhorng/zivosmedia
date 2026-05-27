-- Travel Service Type Enum
CREATE TYPE travel_service_type AS ENUM ('flights', 'hotels', 'cars');

-- Travel Booking Status Enum
CREATE TYPE travel_booking_status AS ENUM ('pending', 'redirected', 'completed', 'failed', 'cancelled');

-- Checkout Mode Enum
CREATE TYPE checkout_mode AS ENUM ('redirect', 'iframe');

-- =============================================================================
-- Travel Search Sessions
-- Stores search parameters for flights, hotels, and car rentals
-- =============================================================================
CREATE TABLE public.travel_search_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  service_type travel_service_type NOT NULL,
  search_params jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for session lookups
CREATE INDEX idx_travel_search_sessions_session_id ON public.travel_search_sessions(session_id);
CREATE INDEX idx_travel_search_sessions_user_id ON public.travel_search_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_travel_search_sessions_expires ON public.travel_search_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.travel_search_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can create search sessions (guest flow)
CREATE POLICY "Anyone can create search sessions"
  ON public.travel_search_sessions FOR INSERT
  WITH CHECK (true);

-- RLS: Users can view their own sessions, guests by session_id
CREATE POLICY "Users can view own sessions"
  ON public.travel_search_sessions FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_id IS NULL
    OR public.has_role(auth.uid(), 'admin')
  );

-- =============================================================================
-- Travel Offers
-- Stores selected offers from search results
-- =============================================================================
CREATE TABLE public.travel_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_session_id uuid REFERENCES public.travel_search_sessions(id) ON DELETE CASCADE,
  service_type travel_service_type NOT NULL,
  partner_id text NOT NULL,
  partner_name text,
  offer_data jsonb NOT NULL DEFAULT '{}',
  price_amount numeric(10,2),
  price_currency text DEFAULT 'USD',
  is_selected boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for offer lookups
CREATE INDEX idx_travel_offers_session ON public.travel_offers(search_session_id);
CREATE INDEX idx_travel_offers_selected ON public.travel_offers(is_selected) WHERE is_selected = true;

-- Enable RLS
ALTER TABLE public.travel_offers ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can create offers
CREATE POLICY "Anyone can create offers"
  ON public.travel_offers FOR INSERT
  WITH CHECK (true);

-- RLS: Anyone can view offers (linked to session)
CREATE POLICY "Anyone can view offers"
  ON public.travel_offers FOR SELECT
  USING (true);

-- RLS: Anyone can update offer selection
CREATE POLICY "Anyone can update offers"
  ON public.travel_offers FOR UPDATE
  USING (true);

-- =============================================================================
-- Travel Bookings
-- Stores traveler info and booking status
-- =============================================================================
CREATE TABLE public.travel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  offer_id uuid REFERENCES public.travel_offers(id) ON DELETE SET NULL,
  service_type travel_service_type NOT NULL,
  traveler_info jsonb NOT NULL DEFAULT '{}',
  partner_booking_ref text,
  status travel_booking_status NOT NULL DEFAULT 'pending',
  partner_redirect_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for booking lookups
CREATE INDEX idx_travel_bookings_user ON public.travel_bookings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_travel_bookings_email ON public.travel_bookings(email);
CREATE INDEX idx_travel_bookings_status ON public.travel_bookings(status);
CREATE INDEX idx_travel_bookings_ref ON public.travel_bookings(partner_booking_ref) WHERE partner_booking_ref IS NOT NULL;

-- Enable RLS
ALTER TABLE public.travel_bookings ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can create bookings (guest flow)
CREATE POLICY "Anyone can create bookings"
  ON public.travel_bookings FOR INSERT
  WITH CHECK (true);

-- RLS: Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON public.travel_bookings FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: Users can update their own bookings
CREATE POLICY "Users can update own bookings"
  ON public.travel_bookings FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_travel_bookings_updated_at
  BEFORE UPDATE ON public.travel_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Partner Redirect Logs
-- Audit trail for all partner redirects
-- =============================================================================
CREATE TABLE public.partner_redirect_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.travel_bookings(id) ON DELETE SET NULL,
  partner_id text NOT NULL,
  partner_name text,
  service_type travel_service_type NOT NULL,
  redirect_url text NOT NULL,
  redirect_mode checkout_mode NOT NULL DEFAULT 'redirect',
  ip_address inet,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for log lookups
CREATE INDEX idx_partner_redirect_logs_booking ON public.partner_redirect_logs(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_partner_redirect_logs_partner ON public.partner_redirect_logs(partner_id);
CREATE INDEX idx_partner_redirect_logs_created ON public.partner_redirect_logs(created_at);

-- Enable RLS
ALTER TABLE public.partner_redirect_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can create logs
CREATE POLICY "Anyone can create redirect logs"
  ON public.partner_redirect_logs FOR INSERT
  WITH CHECK (true);

-- RLS: Admins can view all logs
CREATE POLICY "Admins can view redirect logs"
  ON public.partner_redirect_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- Partner Checkout Config
-- Admin-configurable partner checkout settings
-- =============================================================================
CREATE TABLE public.partner_checkout_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type travel_service_type NOT NULL,
  partner_id text NOT NULL UNIQUE,
  partner_name text NOT NULL,
  checkout_url_template text NOT NULL,
  checkout_mode checkout_mode NOT NULL DEFAULT 'redirect',
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  logo_url text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for config lookups
CREATE INDEX idx_partner_checkout_config_service ON public.partner_checkout_config(service_type);
CREATE INDEX idx_partner_checkout_config_active ON public.partner_checkout_config(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.partner_checkout_config ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view active configs
CREATE POLICY "Anyone can view active partner configs"
  ON public.partner_checkout_config FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can modify configs
CREATE POLICY "Admins can manage partner configs"
  ON public.partner_checkout_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_partner_checkout_config_updated_at
  BEFORE UPDATE ON public.partner_checkout_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Seed default partner configurations
-- =============================================================================
INSERT INTO public.partner_checkout_config (service_type, partner_id, partner_name, checkout_url_template, checkout_mode, priority, is_active)
VALUES 
  ('flights', 'aviasales', 'Aviasales', 'https://tp.media/r?marker=700031&trs=432874&p=4114&u={url}', 'redirect', 1, true),
  ('hotels', 'booking', 'Booking.com', 'https://www.booking.com/searchresults.html?aid=2442826&dest_id={dest_id}&checkin={checkin}&checkout={checkout}', 'redirect', 1, true),
  ('cars', 'economybookings', 'EconomyBookings', 'https://www.economybookings.com/en?a_aid=zivo&pick_up={pickup}&drop_off={dropoff}&pick_up_date={pickup_date}&drop_off_date={dropoff_date}', 'redirect', 1, true)
ON CONFLICT (partner_id) DO NOTHING;