-- Allow truly anonymous users to request a booking via the public salon site
-- (/salon/:slug). RLS scopes what they can write; a sanitization trigger
-- forces snapshotted fields (price, duration, end_at, names) to match the
-- catalog so the form can't lie about prices or service identities.

-- Force safe values + snapshot from catalog on every public-source insert.
CREATE OR REPLACE FUNCTION public.tg_salon_sanitize_public_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc RECORD;
  v_sty RECORD;
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

  -- Force everything else to safe values regardless of what the client sent.
  NEW.status := 'pending';
  NEW.client_id := NULL;
  NEW.created_by_user_id := NULL;
  NEW.tip_cents := 0;
  NEW.tax_cents := 0;
  NEW.deposit_cents := 0;
  NEW.deposit_paid_at := NULL;
  NEW.no_show_fee_charged_cents := 0;
  NEW.cancelled_at := NULL;
  NEW.cancellation_reason := NULL;
  NEW.internal_notes := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_sanitize_public_booking ON public.salon_bookings;
CREATE TRIGGER salon_sanitize_public_booking
  BEFORE INSERT ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_sanitize_public_booking();

-- Public RLS — what an anonymous browser is allowed to insert.
-- Combined with the trigger above, this enforces:
--   1) only into an active salon,
--   2) referencing an active service that belongs to that salon,
--   3) status forced to 'pending', source forced to 'app',
--   4) tip/tax/deposit forced to 0,
--   5) client_id / created_by_user_id forced to NULL.
CREATE POLICY "Public can request bookings"
  ON public.salon_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source = 'app'
    AND status = 'pending'
    AND client_id IS NULL
    AND created_by_user_id IS NULL
    AND tip_cents = 0
    AND tax_cents = 0
    AND deposit_cents = 0
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
