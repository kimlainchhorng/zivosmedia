-- GeoIP country tracking on login events.
--
-- WHY: a successful login from a never-seen-before COUNTRY is an even
-- stronger account-takeover signal than a never-seen device, because devices
-- legitimately rotate (new phone) but countries usually don't (a user moving
-- abroad is a once-in-years event). Catching country changes catches:
--   - credential stuffing from offshore botnets
--   - sessions that survived a password leak before rotation
--
-- This migration is additive: it adds a `country` column to auth_login_events,
-- a side-channel RPC the edge auth handler can call to set the country
-- *after* `auth_record_login_attempt` (so we don't have to touch that big
-- function), and a trigger on UPDATE of `country` that enqueues a
-- `country_change_login` notification through the existing
-- security_notification_queue.

ALTER TABLE public.auth_login_events
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_login_events_country
  ON public.auth_login_events (identifier, country, created_at DESC)
  WHERE success = TRUE AND country IS NOT NULL;

-- ── 1. Side-channel RPC ─────────────────────────────────────────────────────
-- The edge handler that wraps Supabase Auth calls auth_record_login_attempt
-- (no country param), then immediately calls this with the cf-ipcountry
-- header. We update the MOST RECENT row for this identifier in the last 30s
-- to keep the call binding without exposing event_id externally.
CREATE OR REPLACE FUNCTION public.auth_set_recent_login_country(
  _identifier TEXT,
  _country TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_country TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_id := public.auth_normalize_identifier(_identifier);
  IF v_id = '' THEN RETURN; END IF;

  v_country := upper(trim(coalesce(_country, '')));
  IF v_country = '' OR length(v_country) > 4 THEN RETURN; END IF;

  UPDATE public.auth_login_events
     SET country = v_country
   WHERE id = (
     SELECT id FROM public.auth_login_events
      WHERE identifier = v_id
        AND created_at >= now() - interval '30 seconds'
        AND country IS NULL
      ORDER BY created_at DESC
      LIMIT 1
   );
END;
$$;

REVOKE ALL ON FUNCTION public.auth_set_recent_login_country(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_set_recent_login_country(TEXT, TEXT) TO service_role;

-- ── 2. Country-change detection trigger ─────────────────────────────────────
-- Fires AFTER UPDATE of country (when set from NULL → value). We compare to
-- the prior most-recent successful login's country for the same identifier.
-- New countries enqueue a `country_change_login` notification AND mirror to
-- security_events as `auth.country_change` so the audit page sees it.
CREATE OR REPLACE FUNCTION public._trg_auth_login_country_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior_country TEXT;
  v_user_id UUID;
BEGIN
  IF NOT NEW.success OR NEW.country IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.country IS NOT NULL AND OLD.country = NEW.country THEN
    RETURN NEW;
  END IF;

  -- Look for any prior SUCCESSFUL login from this identifier with a country.
  -- We exclude this row by id.
  SELECT country INTO v_prior_country
  FROM public.auth_login_events
  WHERE identifier = NEW.identifier
    AND success = TRUE
    AND country IS NOT NULL
    AND id <> NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- First time we've ever seen a country for this user → not a change.
  IF v_prior_country IS NULL THEN
    RETURN NEW;
  END IF;

  -- Same country as last time → not a change.
  IF v_prior_country = NEW.country THEN
    RETURN NEW;
  END IF;

  -- Has this user EVER logged in from this country before? If yes, they're
  -- a frequent traveler and we don't want to spam them.
  IF EXISTS (
    SELECT 1 FROM public.auth_login_events
     WHERE identifier = NEW.identifier
       AND success = TRUE
       AND country = NEW.country
       AND id <> NEW.id
     LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = NEW.identifier
  LIMIT 1;

  INSERT INTO public.security_notification_queue (kind, identifier, user_id, payload)
  VALUES (
    'country_change_login',
    NEW.identifier,
    v_user_id,
    jsonb_build_object(
      'event_id', NEW.id,
      'prior_country', v_prior_country,
      'new_country', NEW.country,
      'detected_at', now()
    )
  );

  INSERT INTO public.security_events (event_type, severity, user_id, event_data, is_blocked)
  VALUES (
    'auth.country_change',
    'warn',
    v_user_id,
    jsonb_build_object(
      'identifier', NEW.identifier,
      'prior_country', v_prior_country,
      'new_country', NEW.country
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_login_events_country_change ON public.auth_login_events;
CREATE TRIGGER auth_login_events_country_change
  AFTER UPDATE OF country ON public.auth_login_events
  FOR EACH ROW
  WHEN (NEW.country IS NOT NULL AND (OLD.country IS NULL OR OLD.country <> NEW.country))
  EXECUTE FUNCTION public._trg_auth_login_country_change();

COMMENT ON TRIGGER auth_login_events_country_change ON public.auth_login_events IS
  'Detects login from a country the user has never used before, enqueues a '
  '`country_change_login` notification. Frequent travelers (>1 prior success '
  'from this country) are excluded so we don''t spam.';
