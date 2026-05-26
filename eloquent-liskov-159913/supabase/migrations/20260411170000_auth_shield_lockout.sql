-- Auth Shield: adaptive login lockout and incident escalation.

CREATE TABLE IF NOT EXISTS public.auth_login_protection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  failed_streak INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_login_protection ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_login_protection FROM anon, authenticated;

CREATE POLICY "Admins can view auth login protection"
  ON public.auth_login_protection
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.auth_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  blocked_before_attempt BOOLEAN NOT NULL DEFAULT false,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_login_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_login_events FROM anon, authenticated;

CREATE POLICY "Admins can view auth login events"
  ON public.auth_login_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_auth_login_events_created
  ON public.auth_login_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_login_events_identifier
  ON public.auth_login_events(identifier, created_at DESC);

CREATE OR REPLACE FUNCTION public.auth_normalize_identifier(_identifier TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(_identifier, '')));
$$;

CREATE OR REPLACE FUNCTION public.auth_precheck_login(
  _identifier TEXT,
  _device_fingerprint TEXT DEFAULT NULL
)
RETURNS TABLE (
  allowed BOOLEAN,
  blocked_until TIMESTAMPTZ,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_id TEXT;
  state_row public.auth_login_protection%ROWTYPE;
BEGIN
  normalized_id := public.auth_normalize_identifier(_identifier);

  IF normalized_id = '' THEN
    RETURN QUERY SELECT false, NULL::timestamptz, 'Invalid login identifier';
    RETURN;
  END IF;

  SELECT * INTO state_row
  FROM public.auth_login_protection
  WHERE identifier = normalized_id;

  IF state_row.blocked_until IS NOT NULL AND state_row.blocked_until > now() THEN
    INSERT INTO public.auth_login_events(identifier, success, blocked_before_attempt, device_fingerprint)
    VALUES (normalized_id, false, true, _device_fingerprint);

    RETURN QUERY SELECT false, state_row.blocked_until, 'Too many failed attempts. Try again later.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::timestamptz, 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_record_login_attempt(
  _identifier TEXT,
  _success BOOLEAN,
  _device_fingerprint TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_id TEXT;
  current_state public.auth_login_protection%ROWTYPE;
  new_streak INTEGER;
  next_block_until TIMESTAMPTZ;
  prev_hash TEXT;
  new_hash TEXT;
BEGIN
  normalized_id := public.auth_normalize_identifier(_identifier);
  IF normalized_id = '' THEN
    RETURN;
  END IF;

  SELECT * INTO current_state
  FROM public.auth_login_protection
  WHERE identifier = normalized_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.auth_login_protection(identifier)
    VALUES (normalized_id);

    SELECT * INTO current_state
    FROM public.auth_login_protection
    WHERE identifier = normalized_id
    FOR UPDATE;
  END IF;

  IF _success THEN
    UPDATE public.auth_login_protection
    SET
      failed_streak = 0,
      blocked_until = NULL,
      last_success_at = now(),
      updated_at = now()
    WHERE identifier = normalized_id;

    INSERT INTO public.auth_login_events(identifier, success, blocked_before_attempt, device_fingerprint)
    VALUES (normalized_id, true, false, _device_fingerprint);

    RETURN;
  END IF;

  new_streak := coalesce(current_state.failed_streak, 0) + 1;
  next_block_until := NULL;

  IF new_streak >= 12 THEN
    next_block_until := now() + interval '2 hours';
  ELSIF new_streak >= 8 THEN
    next_block_until := now() + interval '30 minutes';
  ELSIF new_streak >= 5 THEN
    next_block_until := now() + interval '10 minutes';
  END IF;

  UPDATE public.auth_login_protection
  SET
    failed_streak = new_streak,
    blocked_until = next_block_until,
    last_failed_at = now(),
    updated_at = now()
  WHERE identifier = normalized_id;

  INSERT INTO public.auth_login_events(identifier, success, blocked_before_attempt, device_fingerprint)
  VALUES (normalized_id, false, false, _device_fingerprint);

  IF next_block_until IS NOT NULL THEN
    SELECT chain_hash INTO prev_hash
    FROM public.security_incidents
    ORDER BY created_at DESC
    LIMIT 1;

    new_hash := public.compute_incident_chain_hash(
      prev_hash,
      'auth_shield',
      CASE WHEN new_streak >= 12 THEN 'critical' ELSE 'high' END,
      NULL,
      now()
    );

    INSERT INTO public.security_incidents (
      source,
      severity,
      summary,
      details,
      prev_chain_hash,
      chain_hash
    ) VALUES (
      'auth_shield',
      CASE WHEN new_streak >= 12 THEN 'critical' ELSE 'high' END,
      'Adaptive login lockout triggered',
      jsonb_build_object(
        'identifier', normalized_id,
        'failed_streak', new_streak,
        'blocked_until', next_block_until,
        'device_fingerprint', _device_fingerprint
      ),
      prev_hash,
      new_hash
    );
  END IF;
END;
$$;