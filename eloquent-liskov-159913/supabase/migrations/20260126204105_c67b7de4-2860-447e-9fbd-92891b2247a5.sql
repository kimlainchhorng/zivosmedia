-- Create table to store cross-app authentication tokens
CREATE TABLE public.cross_app_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  target_app TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cross_app_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
-- No public policies needed as this is internal-only

-- Create index for fast token lookup
CREATE INDEX idx_cross_app_tokens_lookup ON public.cross_app_tokens (token, used, expires_at);

-- Auto-cleanup expired tokens (optional: can be done via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cross_app_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;