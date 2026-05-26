-- Salon Marketing Campaigns
--
-- Owner-driven one-off blasts (SMS + email) to a chosen client cohort. The
-- reminder system is reactive (driven by booking dates / inactivity);
-- campaigns are proactive (owner decides who + what + when).
--
-- New tables:
--   * salon_campaigns           — one row per blast (status machine, cohort
--                                  definition, message bodies, counts)
--   * salon_campaign_recipients — fanout target rows, status per recipient,
--                                  idempotency_key keyed to (campaign, client)
--
-- New RPC:
--   * salon_campaign_resolve_cohort(store_id, kind, params)
--       — owner-only, expands the cohort into a list of clients
--
-- The salon-send-campaign edge function (separate file) consumes this.

------------------------------------------------------------------------------
-- 1. salon_campaigns
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'failed', 'cancelled')),
  channel_sms BOOLEAN NOT NULL DEFAULT false,
  channel_email BOOLEAN NOT NULL DEFAULT true,
  cohort_kind TEXT NOT NULL DEFAULT 'all'
    CHECK (cohort_kind IN ('all', 'dormant', 'tag', 'recent', 'birthday_month')),
  cohort_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT CHECK (subject IS NULL OR char_length(subject) <= 200),
  body_html TEXT CHECK (body_html IS NULL OR char_length(body_html) <= 20000),
  sms_body TEXT CHECK (sms_body IS NULL OR char_length(sms_body) <= 320),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  error TEXT CHECK (error IS NULL OR char_length(error) <= 500),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_campaigns_store_idx
  ON public.salon_campaigns (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS salon_campaigns_status_idx
  ON public.salon_campaigns (status);

DROP TRIGGER IF EXISTS salon_campaigns_set_updated_at ON public.salon_campaigns;
CREATE TRIGGER salon_campaigns_set_updated_at
  BEFORE UPDATE ON public.salon_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

------------------------------------------------------------------------------
-- 2. Status-flip guard — refuse transitions out of terminal states + ensure
-- a channel has a body when moving to 'sending'.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_campaign_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Terminal statuses are immutable.
  IF OLD.status IN ('sent', 'failed', 'cancelled') AND OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'campaign in terminal status (%) cannot transition to %', OLD.status, NEW.status;
  END IF;

  -- Going to 'sending' requires at least one channel with a body.
  IF NEW.status = 'sending' AND OLD.status <> 'sending' THEN
    IF NOT (NEW.channel_sms OR NEW.channel_email) THEN
      RAISE EXCEPTION 'campaign needs at least one channel enabled';
    END IF;
    IF NEW.channel_sms AND (NEW.sms_body IS NULL OR length(trim(NEW.sms_body)) = 0) THEN
      RAISE EXCEPTION 'SMS channel enabled but sms_body is empty';
    END IF;
    IF NEW.channel_email AND (NEW.body_html IS NULL OR length(trim(NEW.body_html)) = 0) THEN
      RAISE EXCEPTION 'Email channel enabled but body_html is empty';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_campaigns_status_guard ON public.salon_campaigns;
CREATE TRIGGER salon_campaigns_status_guard
  BEFORE UPDATE ON public.salon_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_campaign_status_guard();

------------------------------------------------------------------------------
-- 3. salon_campaign_recipients
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.salon_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  -- Snapshot: keep readable even if the client row is deleted/changed.
  client_name TEXT CHECK (client_name IS NULL OR char_length(client_name) <= 120),
  client_phone TEXT CHECK (client_phone IS NULL OR char_length(client_phone) <= 30),
  client_email TEXT CHECK (client_email IS NULL OR char_length(client_email) <= 254),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped_no_contact', 'skipped_opt_out', 'skipped_blocked')),
  error TEXT CHECK (error IS NULL OR char_length(error) <= 500),
  idempotency_key TEXT NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_campaign_recipients_campaign_idx
  ON public.salon_campaign_recipients (campaign_id, status);

------------------------------------------------------------------------------
-- 4. RLS
------------------------------------------------------------------------------

ALTER TABLE public.salon_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their campaigns"
  ON public.salon_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_campaigns.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_campaigns.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners read their campaign recipients"
  ON public.salon_campaign_recipients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_campaigns c
      JOIN public.store_profiles sp ON sp.id = c.store_id
      WHERE c.id = salon_campaign_recipients.campaign_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- No INSERT/UPDATE/DELETE policies for recipients — service role bypasses RLS
-- and is the only writer (via the salon-send-campaign edge function).

------------------------------------------------------------------------------
-- 5. Cohort expansion RPC
--
-- Implements the five cohort kinds in one function so adding more is easy.
-- ALWAYS filters out marketing_opt_in=false and is_blocked=true so the
-- owner-visible preview count matches what actually gets sent.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.salon_campaign_resolve_cohort(
  p_store_id UUID,
  p_kind TEXT,
  p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  client_id UUID,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  sms_opt_in BOOLEAN,
  email_opt_in BOOLEAN,
  marketing_opt_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Owner / admin gate.
  SELECT EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id = p_store_id
      AND sp.owner_id = (SELECT auth.uid())
  ) INTO v_is_owner;
  IF NOT v_is_owner AND NOT public.has_role((SELECT auth.uid()), 'admin') THEN
    RAISE EXCEPTION 'not authorized for store %', p_store_id;
  END IF;

  IF p_kind = 'all' THEN
    RETURN QUERY
      SELECT c.id, c.display_name, c.phone, c.email,
             c.sms_opt_in, c.email_opt_in, c.marketing_opt_in
        FROM public.salon_clients c
        WHERE c.store_id = p_store_id
          AND c.marketing_opt_in = true
          AND c.is_blocked = false;
  ELSIF p_kind = 'dormant' THEN
    RETURN QUERY
      SELECT c.id, c.display_name, c.phone, c.email,
             c.sms_opt_in, c.email_opt_in, c.marketing_opt_in
        FROM public.salon_clients c
        WHERE c.store_id = p_store_id
          AND c.marketing_opt_in = true
          AND c.is_blocked = false
          AND c.last_visit_at IS NOT NULL
          AND c.last_visit_at < v_now - make_interval(days => COALESCE((p_params->>'days')::int, 60));
  ELSIF p_kind = 'recent' THEN
    RETURN QUERY
      SELECT c.id, c.display_name, c.phone, c.email,
             c.sms_opt_in, c.email_opt_in, c.marketing_opt_in
        FROM public.salon_clients c
        WHERE c.store_id = p_store_id
          AND c.marketing_opt_in = true
          AND c.is_blocked = false
          AND c.last_visit_at IS NOT NULL
          AND c.last_visit_at >= v_now - make_interval(days => COALESCE((p_params->>'days')::int, 90));
  ELSIF p_kind = 'tag' THEN
    RETURN QUERY
      SELECT c.id, c.display_name, c.phone, c.email,
             c.sms_opt_in, c.email_opt_in, c.marketing_opt_in
        FROM public.salon_clients c
        WHERE c.store_id = p_store_id
          AND c.marketing_opt_in = true
          AND c.is_blocked = false
          AND (p_params->>'tag') IS NOT NULL
          AND (p_params->>'tag') = ANY(c.tags);
  ELSIF p_kind = 'birthday_month' THEN
    RETURN QUERY
      SELECT c.id, c.display_name, c.phone, c.email,
             c.sms_opt_in, c.email_opt_in, c.marketing_opt_in
        FROM public.salon_clients c
        WHERE c.store_id = p_store_id
          AND c.marketing_opt_in = true
          AND c.is_blocked = false
          AND c.birthday IS NOT NULL
          AND EXTRACT(MONTH FROM c.birthday)::int = COALESCE((p_params->>'month')::int, EXTRACT(MONTH FROM v_now)::int);
  ELSE
    RAISE EXCEPTION 'unknown cohort kind: %', p_kind;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_campaign_resolve_cohort(UUID, TEXT, JSONB) TO authenticated;
