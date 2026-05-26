-- Auth Shield playbooks: auto-quarantine on critical incidents + admin force quarantine.

CREATE OR REPLACE FUNCTION public.apply_auth_security_playbook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_id TEXT;
BEGIN
  IF NEW.source <> 'auth_shield' THEN
    RETURN NEW;
  END IF;

  normalized_id := public.auth_normalize_identifier(COALESCE(NEW.details->>'identifier', ''));
  IF normalized_id = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.severity = 'critical' THEN
    INSERT INTO public.auth_login_protection (
      identifier,
      failed_streak,
      blocked_until,
      updated_at
    ) VALUES (
      normalized_id,
      12,
      now() + interval '6 hours',
      now()
    )
    ON CONFLICT (identifier)
    DO UPDATE SET
      failed_streak = GREATEST(public.auth_login_protection.failed_streak, 12),
      blocked_until = GREATEST(
        COALESCE(public.auth_login_protection.blocked_until, now()),
        now() + interval '6 hours'
      ),
      updated_at = now();

    INSERT INTO public.auth_login_events (
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
      true,
      NULL,
      95,
      ARRAY['critical_incident_playbook'],
      jsonb_build_object(
        'phase', 'playbook_enforcement',
        'incident_id', NEW.id,
        'source', NEW.source,
        'severity', NEW.severity
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_auth_security_playbook ON public.security_incidents;
CREATE TRIGGER trg_apply_auth_security_playbook
AFTER INSERT ON public.security_incidents
FOR EACH ROW
EXECUTE FUNCTION public.apply_auth_security_playbook();

CREATE OR REPLACE FUNCTION public.admin_force_auth_quarantine(
  _identifier TEXT,
  _hours INTEGER DEFAULT 6
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_id TEXT;
  duration_hours INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can force auth quarantine';
  END IF;

  normalized_id := public.auth_normalize_identifier(_identifier);
  IF normalized_id = '' THEN
    RAISE EXCEPTION 'Invalid identifier';
  END IF;

  duration_hours := LEAST(GREATEST(_hours, 1), 72);

  INSERT INTO public.auth_login_protection (
    identifier,
    failed_streak,
    blocked_until,
    updated_at
  ) VALUES (
    normalized_id,
    12,
    now() + make_interval(hours => duration_hours),
    now()
  )
  ON CONFLICT (identifier)
  DO UPDATE SET
    failed_streak = GREATEST(public.auth_login_protection.failed_streak, 12),
    blocked_until = GREATEST(
      COALESCE(public.auth_login_protection.blocked_until, now()),
      now() + make_interval(hours => duration_hours)
    ),
    updated_at = now();

  INSERT INTO public.auth_login_events (
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
    true,
    NULL,
    90,
    ARRAY['admin_forced_quarantine'],
    jsonb_build_object(
      'phase', 'admin_quarantine',
      'hours', duration_hours,
      'admin_id', auth.uid()
    )
  );

  RETURN true;
END;
$$;