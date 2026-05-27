
-- Add device_id and last_seen_at columns to existing user_devices table
ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Add unique constraint for multi-account detection
CREATE UNIQUE INDEX IF NOT EXISTS user_devices_device_role_user_unique
  ON public.user_devices (user_id, device_id, role);

-- Recreate RPCs to match plan
CREATE OR REPLACE FUNCTION public.link_user_device(p_device_id text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_devices (user_id, device_id, role, last_seen_at)
  VALUES (auth.uid(), p_device_id, p_role, now())
  ON CONFLICT (user_id, device_id, role)
  DO UPDATE SET last_seen_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.check_multi_account(
  p_device_id text,
  p_role text,
  p_max_users int,
  p_days int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_count
  FROM public.user_devices
  WHERE device_id = p_device_id
    AND role = p_role
    AND last_seen_at >= now() - (p_days || ' days')::interval;

  RETURN jsonb_build_object(
    'flagged', v_count > p_max_users,
    'user_count', v_count,
    'threshold', p_max_users
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_risk_event(
  p_role text,
  p_event_type text,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.risk_events (user_id, role, event_type, details)
  VALUES (auth.uid(), p_role, p_event_type, p_details);
END;
$$;
