-- New-device login detection + alert queue.
--
-- WHY: when a successful login happens from a never-before-seen device for
-- the same identifier (email), it's the strongest single signal of account
-- takeover. Either the user genuinely got a new phone, or someone else has
-- their password. Either way, the user wants to know immediately.
--
-- Pieces:
--   1. public.security_notification_queue — outbound email/push queue, drained
--      by a worker (edge function or pg_cron). Service-role-only writes/reads.
--   2. public._trg_auth_login_events_new_device — AFTER INSERT trigger that
--      detects first-time-seen (identifier, device_fingerprint) on a success
--      and enqueues a "new_device_login" notification.
--   3. public.dequeue_security_notifications(_limit, _kinds) — service-role
--      RPC for the worker to atomically pull a batch.
--   4. public.mark_security_notification_sent / _failed — completion API.

-- ── 1. Queue table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,                              -- 'new_device_login', etc.
  identifier TEXT NULL,                            -- email/handle for the recipient
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_flight', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ NULL,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now()  -- scheduled-send / retry backoff
);

CREATE INDEX IF NOT EXISTS idx_security_notif_queue_pending
  ON public.security_notification_queue (available_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_security_notif_queue_user
  ON public.security_notification_queue (user_id, created_at DESC);

ALTER TABLE public.security_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_notification_queue FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_notification_queue FROM anon, authenticated;

CREATE POLICY "security_notif_queue_admin_read"
  ON public.security_notification_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.security_notification_queue IS
  'Outbound queue for security notifications. Drained by a worker (edge fn '
  'or pg_cron). RLS forced; service-role writes only.';

-- ── 2. New-device detection trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._trg_auth_login_events_new_device()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seen INT := 0;
  v_user_id UUID;
BEGIN
  -- Only act on SUCCESSFUL logins with a device fingerprint we can compare.
  IF NOT NEW.success OR NEW.device_fingerprint IS NULL OR NEW.device_fingerprint = '' THEN
    RETURN NEW;
  END IF;

  -- Has this (identifier, device_fingerprint) succeeded before?
  -- We exclude THIS row by id since the trigger fires AFTER INSERT.
  SELECT COUNT(*) INTO v_seen
  FROM public.auth_login_events
  WHERE identifier = NEW.identifier
    AND device_fingerprint = NEW.device_fingerprint
    AND success = TRUE
    AND id <> NEW.id
  LIMIT 1;

  IF v_seen > 0 THEN
    RETURN NEW;  -- known device, no alert
  END IF;

  -- Look up user_id from the email (best-effort; trigger never blocks login).
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = NEW.identifier
  LIMIT 1;

  -- Skip if this is the user's very first ever successful login on any
  -- device — that's a signup, not a new-device event.
  IF NOT EXISTS (
    SELECT 1 FROM public.auth_login_events
    WHERE identifier = NEW.identifier
      AND success = TRUE
      AND id <> NEW.id
    LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.security_notification_queue (kind, identifier, user_id, payload)
  VALUES (
    'new_device_login',
    NEW.identifier,
    v_user_id,
    jsonb_build_object(
      'event_id', NEW.id,
      'device_fingerprint', NEW.device_fingerprint,
      'detected_at', NEW.created_at
    )
  );

  -- Mirror to security_events for the admin audit page.
  INSERT INTO public.security_events (event_type, severity, user_id, event_data, is_blocked)
  VALUES (
    'auth.new_device_login',
    'warn',
    v_user_id,
    jsonb_build_object(
      'identifier', NEW.identifier,
      'device_fingerprint', NEW.device_fingerprint
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_login_events_new_device ON public.auth_login_events;
CREATE TRIGGER auth_login_events_new_device
  AFTER INSERT ON public.auth_login_events
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_auth_login_events_new_device();

-- ── 3. Worker dequeue API ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dequeue_security_notifications(
  _limit INT DEFAULT 50,
  _kinds TEXT[] DEFAULT NULL
)
RETURNS SETOF public.security_notification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  v_limit := LEAST(GREATEST(COALESCE(_limit, 50), 1), 500);

  RETURN QUERY
  WITH cte AS (
    SELECT id
    FROM public.security_notification_queue
    WHERE status = 'pending'
      AND available_at <= now()
      AND (_kinds IS NULL OR kind = ANY(_kinds))
    ORDER BY available_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.security_notification_queue q
     SET status = 'in_flight',
         attempts = q.attempts + 1
   WHERE q.id IN (SELECT id FROM cte)
   RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.dequeue_security_notifications(INT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dequeue_security_notifications(INT, TEXT[]) TO service_role;

-- ── 4. Completion API ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_security_notification_sent(_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.security_notification_queue
     SET status = 'sent', sent_at = now(), last_error = NULL
   WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.mark_security_notification_failed(
  _id UUID, _error TEXT, _retry_after_seconds INT DEFAULT 60
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.security_notification_queue
     SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
         last_error = _error,
         available_at = now() + make_interval(secs => _retry_after_seconds)
   WHERE id = _id;
$$;

REVOKE ALL ON FUNCTION public.mark_security_notification_sent(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_security_notification_failed(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_security_notification_sent(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_security_notification_failed(UUID, TEXT, INT) TO service_role;
