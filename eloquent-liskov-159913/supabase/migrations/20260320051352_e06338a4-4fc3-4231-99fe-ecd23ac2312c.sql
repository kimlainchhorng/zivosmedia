
-- Price Alerts table for flight price tracking
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  origin_code TEXT NOT NULL,
  origin_name TEXT,
  destination_code TEXT NOT NULL,
  destination_name TEXT,
  target_price NUMERIC NOT NULL,
  current_price NUMERIC,
  historical_low NUMERIC,
  departure_date DATE,
  return_date DATE,
  flexible_dates BOOLEAN DEFAULT false,
  cabin_class TEXT DEFAULT 'economy',
  passengers INTEGER DEFAULT 1,
  notify_email BOOLEAN DEFAULT true,
  notify_push BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  triggered BOOLEAN DEFAULT false,
  triggered_price NUMERIC,
  triggered_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Policies: users manage their own alerts, anonymous users can create by email
CREATE POLICY "Users can view their own alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id OR (user_id IS NULL AND email IS NOT NULL));

CREATE POLICY "Users can create alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id OR (user_id IS NULL AND email IS NOT NULL));

CREATE POLICY "Users can delete their own alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id OR (user_id IS NULL AND email IS NOT NULL));

-- Index for fast lookups
CREATE INDEX idx_price_alerts_user ON public.price_alerts(user_id) WHERE is_active = true;
CREATE INDEX idx_price_alerts_route ON public.price_alerts(origin_code, destination_code) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
