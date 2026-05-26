
-- Login history table for session/device tracking
CREATE TABLE public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT DEFAULT 'desktop',
  ip_address INET,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  user_agent TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_logged_in_at ON public.login_history(logged_in_at DESC);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can only read their own login history
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert (edge functions log logins)
-- No INSERT policy for authenticated = insert blocked for regular users
