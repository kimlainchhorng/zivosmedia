-- Salon Customer Self-Service Portal
--
-- Activates an authenticated /salon/me area where clients can see their visit
-- history, loyalty totals, gift cards, and toggle communication preferences.
--
-- Half the infrastructure was already in place: salon_clients.user_id links to
-- auth.users, and a dormant RLS policy "Clients can view their own bookings"
-- gates salon_bookings SELECT on that link. The blockers were:
--   1) Nothing populated client_id on public-booking inserts (sanitize trigger
--      forced it to NULL regardless of submitter).
--   2) Nothing back-linked existing email/phone-matched salon_clients rows to
--      a new auth.users row on signup.
--   3) salon_gift_cards had no user_id column.
--   4) salon_loyalty_events + salon_gift_cards were owner-only on SELECT.
--   5) Clients couldn't update their own opt-in columns (FOR UPDATE was
--      owner-scoped).
--
-- This migration addresses all five.

------------------------------------------------------------------------------
-- 1. Gift card recipient linking
------------------------------------------------------------------------------

ALTER TABLE public.salon_gift_cards
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS salon_gift_cards_recipient_user_id_idx
  ON public.salon_gift_cards (recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

------------------------------------------------------------------------------
-- 2. Link salon_clients ↔ auth.users on email/phone match (BEFORE INSERT/UPDATE)
--    Fires when a salon_clients row is created/updated AND user_id is unset.
--    Looks up auth.users by email or phone and stamps user_id.
--    Safe to be idempotent — runs once per row.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_link_client_to_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Email match (case-insensitive). auth.users.email is canonical lowercased.
  IF NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
    SELECT id INTO v_user_id
      FROM auth.users
      WHERE lower(email) = lower(NEW.email)
      LIMIT 1;
  END IF;

  -- Phone match (exact). auth.users.phone is digits-only in most flows; we
  -- match exactly. Owners with non-canonical phones (e.g., "(555) 555-5555")
  -- won't match — that's acceptable for V1.
  IF v_user_id IS NULL AND NEW.phone IS NOT NULL AND length(trim(NEW.phone)) > 0 THEN
    SELECT id INTO v_user_id
      FROM auth.users
      WHERE phone = NEW.phone
      LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    NEW.user_id := v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_clients_link_to_auth_user ON public.salon_clients;
CREATE TRIGGER salon_clients_link_to_auth_user
  BEFORE INSERT OR UPDATE OF email, phone, user_id ON public.salon_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_link_client_to_auth_user();

------------------------------------------------------------------------------
-- 3. Backfill on auth.users insert
--    When a new user signs up, find any unlinked salon_clients rows whose
--    email/phone matches them and stamp user_id. Same for unlinked gift
--    cards by recipient_email.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_auth_user_backfill_salon_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Match on email first (most reliable).
  IF NEW.email IS NOT NULL THEN
    UPDATE public.salon_clients
       SET user_id = NEW.id,
           updated_at = now()
     WHERE user_id IS NULL
       AND lower(email) = lower(NEW.email);

    UPDATE public.salon_gift_cards
       SET recipient_user_id = NEW.id,
           updated_at = now()
     WHERE recipient_user_id IS NULL
       AND lower(recipient_email) = lower(NEW.email);
  END IF;

  -- Match on phone for any salon_clients rows we missed on email.
  IF NEW.phone IS NOT NULL AND length(trim(NEW.phone)) > 0 THEN
    UPDATE public.salon_clients
       SET user_id = NEW.id,
           updated_at = now()
     WHERE user_id IS NULL
       AND phone = NEW.phone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_users_backfill_salon_links ON auth.users;
CREATE TRIGGER auth_users_backfill_salon_links
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_auth_user_backfill_salon_links();

------------------------------------------------------------------------------
-- 4. Extend tg_salon_sanitize_public_booking
--    When created_by_user_id is set on a public-booking insert, find-or-create
--    a salon_clients row for (store_id, user_id) and stamp client_id. This
--    activates the dormant "Clients can view their own bookings" RLS so the
--    portal can list bookings via plain SELECT.
--
--    The trigger previously forced client_id := NULL. We now only do that
--    when there's no authenticated submitter; otherwise we link.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_sanitize_public_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc RECORD;
  v_sty RECORD;
  v_client_id UUID;
BEGIN
  IF NEW.source <> 'app' THEN
    RETURN NEW;
  END IF;

  IF NEW.service_id IS NULL THEN
    RAISE EXCEPTION 'service_id is required for public bookings';
  END IF;

  SELECT id, name, store_id, is_active, price_cents, duration_minutes
    INTO v_svc
    FROM public.salon_services
    WHERE id = NEW.service_id;
  IF v_svc.id IS NULL OR v_svc.store_id <> NEW.store_id OR v_svc.is_active = false THEN
    RAISE EXCEPTION 'invalid or inactive service for this salon';
  END IF;

  NEW.service_name := v_svc.name;
  NEW.price_cents := v_svc.price_cents;
  NEW.duration_minutes := v_svc.duration_minutes;
  NEW.end_at := NEW.start_at + make_interval(mins => v_svc.duration_minutes);

  IF NEW.stylist_id IS NOT NULL THEN
    SELECT id, display_name, store_id, is_active
      INTO v_sty
      FROM public.salon_stylists
      WHERE id = NEW.stylist_id;
    IF v_sty.id IS NULL OR v_sty.store_id <> NEW.store_id OR v_sty.is_active = false THEN
      RAISE EXCEPTION 'invalid or inactive stylist for this salon';
    END IF;
    NEW.stylist_name := v_sty.display_name;
  END IF;

  NEW.status := 'pending';
  -- Force these to safe values regardless of what the client sent.
  NEW.tip_cents := 0;
  NEW.tax_cents := 0;
  NEW.deposit_cents := 0;
  NEW.deposit_paid_cents := 0;
  NEW.deposit_paid_at := NULL;
  NEW.no_show_fee_charged_cents := 0;
  NEW.cancelled_at := NULL;
  NEW.cancellation_reason := NULL;
  NEW.internal_notes := NULL;

  -- Opt-ins — default safe (transactional true, marketing explicit).
  NEW.marketing_opt_in := COALESCE(NEW.marketing_opt_in, false);
  NEW.sms_opt_in       := COALESCE(NEW.sms_opt_in, true);
  NEW.email_opt_in     := COALESCE(NEW.email_opt_in, true);

  IF NEW.referral_source IS NOT NULL THEN
    NEW.referral_source := NULLIF(btrim(NEW.referral_source), '');
    IF NEW.referral_source IS NOT NULL THEN
      NEW.referral_source := left(NEW.referral_source, 120);
    END IF;
  END IF;

  -- ---- Authenticated submitter? Link to a salon_clients row. ---------------
  -- created_by_user_id is the auth.uid() of whoever submitted the form (when
  -- they were signed in). If set, we find-or-create a salon_clients row for
  -- (store_id, user_id) so the dormant client RLS on salon_bookings actually
  -- gates this booking.
  IF NEW.created_by_user_id IS NOT NULL THEN
    SELECT id INTO v_client_id
      FROM public.salon_clients
      WHERE store_id = NEW.store_id
        AND user_id = NEW.created_by_user_id
      LIMIT 1;

    IF v_client_id IS NULL THEN
      INSERT INTO public.salon_clients
        (store_id, user_id, display_name, phone, email,
         sms_opt_in, email_opt_in, marketing_opt_in)
      VALUES
        (NEW.store_id, NEW.created_by_user_id,
         COALESCE(NULLIF(btrim(NEW.client_name), ''), 'Client'),
         NULLIF(btrim(NEW.client_phone), ''),
         NULLIF(btrim(NEW.client_email), ''),
         NEW.sms_opt_in, NEW.email_opt_in, NEW.marketing_opt_in)
      RETURNING id INTO v_client_id;
    END IF;

    NEW.client_id := v_client_id;
  ELSE
    -- Anonymous submitter: keep the historical behavior of NULL client_id.
    NEW.client_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Relax the public-INSERT RLS so authenticated submitters can attribute
-- themselves. We still require created_by_user_id to be either NULL OR equal
-- to the current auth.uid (a stranger can't spoof someone else's user_id).
DROP POLICY IF EXISTS "Public can request bookings" ON public.salon_bookings;
CREATE POLICY "Public can request bookings"
  ON public.salon_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source = 'app'
    AND status = 'pending'
    AND (created_by_user_id IS NULL OR created_by_user_id = (SELECT auth.uid()))
    AND tip_cents = 0
    AND tax_cents = 0
    AND deposit_cents = 0
    AND deposit_paid_cents = 0
    AND no_show_fee_charged_cents = 0
    AND service_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.salon_services s
      WHERE s.id = salon_bookings.service_id
        AND s.store_id = salon_bookings.store_id
        AND s.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.is_active = true
    )
  );

------------------------------------------------------------------------------
-- 5. Read RLS for the portal
------------------------------------------------------------------------------

-- Clients can read their own loyalty events.
DROP POLICY IF EXISTS "Clients view their own loyalty events" ON public.salon_loyalty_events;
CREATE POLICY "Clients view their own loyalty events"
  ON public.salon_loyalty_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_clients c
      WHERE c.id = salon_loyalty_events.client_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- Recipients can read their own gift cards.
DROP POLICY IF EXISTS "Recipients view their own gift cards" ON public.salon_gift_cards;
CREATE POLICY "Recipients view their own gift cards"
  ON public.salon_gift_cards
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = (SELECT auth.uid()));

-- Recipients can read redemptions on cards they own.
DROP POLICY IF EXISTS "Recipients view their own gift card redemptions" ON public.salon_gift_card_redemptions;
CREATE POLICY "Recipients view their own gift card redemptions"
  ON public.salon_gift_card_redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_gift_cards gc
      WHERE gc.id = salon_gift_card_redemptions.gift_card_id
        AND gc.recipient_user_id = (SELECT auth.uid())
    )
  );

------------------------------------------------------------------------------
-- 6. Client self-update of opt-in columns only
--    Clients (user_id = auth.uid()) can flip their three opt-in toggles via
--    the portal. Owner-side fields stay locked to owners.
--    Postgres doesn't support column-level RLS WITH CHECK; we enforce
--    "only these three columns may change" via a BEFORE UPDATE trigger that
--    refuses any other diff when the writer is NOT the owner.
------------------------------------------------------------------------------

CREATE POLICY "Clients update their own preferences"
  ON public.salon_clients
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.tg_salon_client_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Owner / admin writes are unconstrained by this guard.
  SELECT EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id = NEW.store_id
      AND sp.owner_id = (SELECT auth.uid())
  ) INTO v_is_owner;
  v_is_admin := public.has_role((SELECT auth.uid()), 'admin');
  IF v_is_owner OR v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Otherwise the writer is a client editing their own row. Refuse any
  -- diff outside the three opt-in columns + updated_at.
  IF NEW.id            IS DISTINCT FROM OLD.id            THEN RAISE EXCEPTION 'cannot change id'; END IF;
  IF NEW.store_id      IS DISTINCT FROM OLD.store_id      THEN RAISE EXCEPTION 'cannot change store_id'; END IF;
  IF NEW.display_name  IS DISTINCT FROM OLD.display_name  THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.phone         IS DISTINCT FROM OLD.phone         THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.email         IS DISTINCT FROM OLD.email         THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.birthday      IS DISTINCT FROM OLD.birthday      THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.notes         IS DISTINCT FROM OLD.notes         THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.preferred_stylist_id IS DISTINCT FROM OLD.preferred_stylist_id THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.user_id       IS DISTINCT FROM OLD.user_id       THEN RAISE EXCEPTION 'cannot change user_id'; END IF;
  IF NEW.is_blocked    IS DISTINCT FROM OLD.is_blocked    THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.visits_count  IS DISTINCT FROM OLD.visits_count  THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.total_spent_cents IS DISTINCT FROM OLD.total_spent_cents THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;
  IF NEW.last_visit_at IS DISTINCT FROM OLD.last_visit_at THEN RAISE EXCEPTION 'only opt-in columns are self-editable'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_clients_self_update_guard ON public.salon_clients;
CREATE TRIGGER salon_clients_self_update_guard
  BEFORE UPDATE ON public.salon_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_client_self_update_guard();

------------------------------------------------------------------------------
-- 7. Cross-store discovery RPC
--    Returns the salons the current user has any salon_clients link to so the
--    portal index can render "Your salons" without an extra join.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.salon_portal_my_salons()
RETURNS TABLE (
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  logo_url TEXT,
  client_id UUID,
  visits_count INTEGER,
  total_spent_cents INTEGER,
  last_visit_at TIMESTAMPTZ,
  loyalty_points INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id AS store_id,
    sp.name AS store_name,
    sp.slug AS store_slug,
    sp.logo_url,
    c.id AS client_id,
    c.visits_count,
    c.total_spent_cents,
    c.last_visit_at,
    -- salon_clients.loyalty_points is maintained by tg_salon_loyalty_apply_delta
    -- so we can read the denormalized value directly.
    COALESCE(c.loyalty_points, 0) AS loyalty_points
  FROM public.salon_clients c
  JOIN public.store_profiles sp ON sp.id = c.store_id
  WHERE c.user_id = (SELECT auth.uid())
    AND sp.is_active = true
  ORDER BY c.last_visit_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.salon_portal_my_salons() TO authenticated;
