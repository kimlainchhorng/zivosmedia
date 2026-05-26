-- SMS Daily Limits table for rate limiting (5 SMS/user/day)
CREATE TABLE public.sms_daily_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sms_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_sms_daily_limits_date ON public.sms_daily_limits(date);

-- Enable RLS
ALTER TABLE public.sms_daily_limits ENABLE ROW LEVEL SECURITY;

-- Admin-only policy for rate limits
CREATE POLICY "Service role can manage SMS limits"
  ON public.sms_daily_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- SMS OTP Codes table for phone verification
CREATE TABLE public.sms_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sms_otp_phone ON public.sms_otp_codes(phone_e164);
CREATE INDEX idx_sms_otp_user ON public.sms_otp_codes(user_id);
CREATE INDEX idx_sms_otp_expires ON public.sms_otp_codes(expires_at) WHERE verified_at IS NULL;

-- Enable RLS
ALTER TABLE public.sms_otp_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own OTP codes
CREATE POLICY "Users can view own OTP codes"
  ON public.sms_otp_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all OTP codes
CREATE POLICY "Service role can manage OTP codes"
  ON public.sms_otp_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RPC function to atomically increment SMS count
CREATE OR REPLACE FUNCTION public.increment_sms_count(p_user_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO sms_daily_limits (user_id, date, sms_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET sms_count = sms_daily_limits.sms_count + 1;
END;
$$;

-- RPC function to check SMS rate limit
CREATE OR REPLACE FUNCTION public.check_sms_rate_limit(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT sms_count INTO current_count
  FROM sms_daily_limits
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0) < 5;
END;
$$;

-- Add sms_opted_out column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'sms_opted_out'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN sms_opted_out BOOLEAN DEFAULT false;
  END IF;
END $$;