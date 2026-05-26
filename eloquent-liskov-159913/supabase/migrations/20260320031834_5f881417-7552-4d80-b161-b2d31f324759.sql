
-- Flight price alerts: users save a search and get notified on price drops
CREATE TABLE public.flight_price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passengers INT NOT NULL DEFAULT 1,
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  target_price NUMERIC(10,2),
  lowest_seen_price NUMERIC(10,2),
  current_price NUMERIC(10,2),
  last_checked_at TIMESTAMPTZ,
  alert_triggered BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flight_price_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own alerts
CREATE POLICY "Users can view their own alerts"
  ON public.flight_price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
  ON public.flight_price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.flight_price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON public.flight_price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_flight_price_alerts_user ON public.flight_price_alerts(user_id, is_active);
CREATE INDEX idx_flight_price_alerts_route ON public.flight_price_alerts(origin_iata, destination_iata, departure_date) WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_flight_price_alerts_updated_at
  BEFORE UPDATE ON public.flight_price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
