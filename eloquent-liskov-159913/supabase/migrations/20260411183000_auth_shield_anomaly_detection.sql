-- Auth Shield anomaly detection: risky device-change and distributed attack signals.

ALTER TABLE public.auth_login_events
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_labels TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_auth_login_events_risk
  ON public.auth_login_events(risk_score, created_at DESC);

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
  risk_score INTEGER := 0;
  risk_labels TEXT[] := ARRAY[]::TEXT[];
  recent_distinct_failed_devices INTEGER := 0;
  last_success_device TEXT;
  last_success_at TIMESTAMPTZ;
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

  SELECT COUNT(DISTINCT device_fingerprint)
    INTO recent_distinct_failed_devices
  FROM public.auth_login_events
  WHERE identifier = normalized_id
    AND success = false
    AND created_at >= now() - interval '15 minutes'
    AND device_fingerprint IS NOT NULL;

  IF recent_distinct_failed_devices >= 4 THEN
    risk_score := risk_score + 45;
    risk_labels := risk_labels || ARRAY['distributed_failed_attempts'];
  END IF;

  IF recent_distinct_failed_devices >= 6 THEN
    risk_score := risk_score + 55;
    risk_labels := risk_labels || ARRAY['critical_distributed_attack_pattern'];
  END IF;

  IF _success THEN
    SELECT device_fingerprint, created_at
      INTO last_success_device, last_success_at
    FROM public.auth_login_events
    WHERE identifier = normalized_id
      AND success = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_success_device IS NOT NULL
       AND _device_fingerprint IS NOT NULL
       AND last_success_device <> _device_fingerprint
       AND last_success_at IS NOT NULL
       AND last_success_at >= now() - interval '60 minutes' THEN
      risk_score := risk_score + 70;
      risk_labels := risk_labels || ARRAY['rapid_device_change'];
    END IF;

    UPDATE public.auth_login_protection
    SET
      failed_streak = 0,
      blocked_until = NULL,
      last_success_at = now(),
      updated_at = now()
    WHERE identifier = normalized_id;

    INSERT INTO public.auth_login_events(
      identifier,
      success,
      blocked_before_attempt,
      device_fingerprint,
      risk_score,
      risk_labels,
      metadata
    ) VALUES (
      normalized_id,
      true,
      false,
      _device_fingerprint,
      risk_score,
      risk_labels,
      jsonb_build_object('phase', 'success')
    );

    IF risk_score >= 70 THEN
      SELECT chain_hash INTO prev_hash
      FROM public.security_incidents
      ORDER BY created_at DESC
      LIMIT 1;

      new_hash := public.compute_incident_chain_hash(
        prev_hash,
        'auth_shield',
        CASE WHEN risk_score >= 90 THEN 'critical' ELSE 'high' END,
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
        CASE WHEN risk_score >= 90 THEN 'critical' ELSE 'high' END,
        'Suspicious successful login anomaly detected',
        jsonb_build_object(
          'identifier', normalized_id,
          'risk_score', risk_score,
          'risk_labels', risk_labels,
          'device_fingerprint', _device_fingerprint,
          'last_success_device', last_success_device,
          'last_success_at', last_success_at
        ),
        prev_hash,
        new_hash
      );
    END IF;

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

  -- Critical playbook: enforce stronger lockout for likely distributed attacks.
  IF risk_score >= 95 THEN
    IF next_block_until IS NULL OR next_block_until < now() + interval '4 hours' THEN
      next_block_until := now() + interval '4 hours';
    END IF;
  END IF;

  IF next_block_until IS NOT NULL THEN
    risk_score := risk_score + 35;
    risk_labels := risk_labels || ARRAY['adaptive_lockout_triggered'];
  END IF;

  UPDATE public.auth_login_protection
  SET
    failed_streak = new_streak,
    blocked_until = next_block_until,
    last_failed_at = now(),
    updated_at = now()
  WHERE identifier = normalized_id;

  INSERT INTO public.auth_login_events(
    identifier,
    success,
    blocked_before_attempt,
    device_fingerprint,
    risk_score,
    risk_labels,
    metadata
  ) VALUES (
    normalized_id,
    false,
    false,
    _device_fingerprint,
    risk_score,
    risk_labels,
    jsonb_build_object(
      'phase', 'failure',
      'failed_streak', new_streak,
      'blocked_until', next_block_until
    )
  );

  IF next_block_until IS NOT NULL OR risk_score >= 70 THEN
    SELECT chain_hash INTO prev_hash
    FROM public.security_incidents
    ORDER BY created_at DESC
    LIMIT 1;

    new_hash := public.compute_incident_chain_hash(
      prev_hash,
      'auth_shield',
      CASE WHEN new_streak >= 12 OR risk_score >= 90 THEN 'critical' ELSE 'high' END,
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
      CASE WHEN new_streak >= 12 OR risk_score >= 90 THEN 'critical' ELSE 'high' END,
      'Adaptive login lockout triggered',
      jsonb_build_object(
        'identifier', normalized_id,
        'failed_streak', new_streak,
        'blocked_until', next_block_until,
        'risk_score', risk_score,
        'risk_labels', risk_labels,
        'device_fingerprint', _device_fingerprint
      ),
      prev_hash,
      new_hash
    );
  END IF;
END;
$$;
