-- Follow-up to 20260524180000 (added deposit_paid_cents and referral_source).
--
-- The public booking sanitize trigger was written before deposit_paid_cents
-- existed, so an anonymous submitter could now insert a row that claims a
-- deposit has been paid. Force it to 0 alongside the other money fields,
-- and trim/length-cap referral_source so the free-text "How did you hear
-- about us?" field can't be abused with megabyte-long payloads.

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
  NEW.deposit_paid_cents := 0;
  NEW.deposit_paid_at := NULL;
  NEW.no_show_fee_charged_cents := 0;
  NEW.cancelled_at := NULL;
  NEW.cancellation_reason := NULL;
  NEW.internal_notes := NULL;

  -- referral_source is the only free-text field we keep on a public insert.
  -- Trim it, collapse empty strings to NULL, and clip to the column's 120
  -- char limit so a long payload becomes a constraint violation, not a row.
  IF NEW.referral_source IS NOT NULL THEN
    NEW.referral_source := NULLIF(btrim(NEW.referral_source), '');
    IF NEW.referral_source IS NOT NULL THEN
      NEW.referral_source := left(NEW.referral_source, 120);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Extend the RLS WITH CHECK so the new column is locked to 0 at the policy
-- level too. Defense in depth: even if the trigger were dropped, the RLS
-- clause would still reject a non-zero deposit_paid_cents.
DROP POLICY IF EXISTS "Public can request bookings" ON public.salon_bookings;
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
