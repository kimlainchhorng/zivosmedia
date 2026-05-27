
-- Table to track login attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  device_fingerprint text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- No direct user access needed - only via security definer functions
CREATE POLICY "No direct access" ON public.login_attempts FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created 
  ON public.login_attempts (identifier, created_at DESC);

-- Function: precheck login (rate limiting)
CREATE OR REPLACE FUNCTION public.auth_precheck_login(
  _identifier text,
  _device_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures int;
  lockout_until timestamptz;
BEGIN
  -- Count failures in last 15 minutes
  SELECT count(*) INTO recent_failures
  FROM public.login_attempts
  WHERE identifier = lower(_identifier)
    AND success = false
    AND created_at > now() - interval '15 minutes';

  -- Progressive lockout
  IF recent_failures >= 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Account temporarily locked. Try again in 30 minutes.');
  ELSIF recent_failures >= 10 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Too many failed attempts. Try again in 2 minutes.');
  ELSIF recent_failures >= 5 THEN
    -- Check if last failure was within 30 seconds
    IF EXISTS (
      SELECT 1 FROM public.login_attempts
      WHERE identifier = lower(_identifier) AND success = false
        AND created_at > now() - interval '30 seconds'
      LIMIT 1
    ) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Too many attempts. Please wait 30 seconds.');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Function: record login attempt
CREATE OR REPLACE FUNCTION public.auth_record_login_attempt(
  _identifier text,
  _success boolean,
  _device_fingerprint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier, device_fingerprint, success)
  VALUES (lower(_identifier), _device_fingerprint, _success);

  -- Clean up old entries (older than 24 hours)
  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';
END;
$$;
