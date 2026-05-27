-- Flight Search Cache Table (persistent caching for identical searches)
CREATE TABLE IF NOT EXISTS public.flight_search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passengers INT NOT NULL,
  cabin_class TEXT NOT NULL,
  offers_data JSONB NOT NULL,
  offers_count INT NOT NULL DEFAULT 0,
  offer_request_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hits INT NOT NULL DEFAULT 0
);

-- Indexes for cache lookup
CREATE INDEX IF NOT EXISTS idx_flight_cache_key ON public.flight_search_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_flight_cache_expires ON public.flight_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_flight_cache_created ON public.flight_search_cache(created_at);

-- API Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.flight_api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  searches_total INT NOT NULL DEFAULT 0,
  searches_cached INT NOT NULL DEFAULT 0,
  searches_live INT NOT NULL DEFAULT 0,
  bookings_total INT NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  errors_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- API Cost Controls Table
CREATE TABLE IF NOT EXISTS public.flight_api_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_search_cap INT NOT NULL DEFAULT 10000,
  daily_booking_cap INT,
  alert_threshold_percent INT NOT NULL DEFAULT 80,
  cache_ttl_seconds INT NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default limits
INSERT INTO public.flight_api_limits (daily_search_cap, daily_booking_cap, alert_threshold_percent, cache_ttl_seconds)
VALUES (10000, NULL, 80, 120)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.flight_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_api_limits ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage flight cache"
ON public.flight_search_cache
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view API usage"
ON public.flight_api_usage
FOR SELECT
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage API limits"
ON public.flight_api_limits
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add currency field to flight_bookings if not exists
ALTER TABLE public.flight_bookings
  ADD COLUMN IF NOT EXISTS offer_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,6) DEFAULT 1.0;

-- Cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_flight_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.flight_search_cache WHERE expires_at < now();
END;
$$;