-- Multi-tender checkout for salon bookings.
--
-- Today SalonCheckoutDialog flips the booking to `completed` with a single
-- "Charge $X" button — but the actual tender (cash, card, gift card, check,
-- split) is never recorded. Owners doing books have to remember which row
-- on the day was paid how. This migration adds a per-tender ledger so a
-- ticket like "$50 cash + $25 on the card + $10 gift card" lands as three
-- rows summing to $85, with a foreign key to the booking.
--
-- Touches:
--   1) salon_booking_payments — one row per tender on a checkout.
--   2) Trigger on payments to debit a linked gift card automatically
--      (reuses the existing salon_gift_card_redemptions ledger pattern).
--   3) RPC salon_record_booking_payments — atomic insert-all-tenders +
--      mark booking complete in one call (the FE was juggling three
--      round-trips otherwise).

------------------------------------------------------------------------------
-- 1. salon_booking_payments table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.salon_bookings(id) ON DELETE CASCADE,

  method TEXT NOT NULL
    CHECK (method IN ('cash', 'card', 'gift_card', 'check', 'other')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

  -- Free-text reference for the owner's audit (card last 4, check number,
  -- gift card code, etc.). The gift_card_id below is the canonical link
  -- for gift-card tenders; reference is purely informational.
  reference TEXT CHECK (reference IS NULL OR char_length(reference) <= 200),

  -- Only populated when method='gift_card'. Lets the trigger below
  -- automatically debit the card by inserting into salon_gift_card_redemptions.
  gift_card_id UUID REFERENCES public.salon_gift_cards(id) ON DELETE SET NULL,

  recorded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_booking_payments_booking_idx
  ON public.salon_booking_payments (booking_id);
CREATE INDEX IF NOT EXISTS salon_booking_payments_store_created_idx
  ON public.salon_booking_payments (store_id, created_at DESC);

-- A gift_card tender MUST have a gift_card_id; conversely a non-gift_card
-- tender must NOT have one. Locking this down at the DB level keeps the
-- redemption trigger's logic dead simple.
ALTER TABLE public.salon_booking_payments
  DROP CONSTRAINT IF EXISTS salon_booking_payments_gift_card_shape;
ALTER TABLE public.salon_booking_payments
  ADD CONSTRAINT salon_booking_payments_gift_card_shape
  CHECK (
    (method = 'gift_card' AND gift_card_id IS NOT NULL)
    OR
    (method <> 'gift_card' AND gift_card_id IS NULL)
  );

ALTER TABLE public.salon_booking_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage booking payments - all"
  ON public.salon_booking_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_payments.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_payments.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

------------------------------------------------------------------------------
-- 2. Gift-card auto-debit trigger.
--
--    When a salon_booking_payments row lands with method='gift_card', insert
--    the matching salon_gift_card_redemptions row. The existing
--    tg_salon_gift_card_apply_redemption trigger (defined in
--    20260524160000_salon_gift_cards.sql) decrements balance_cents and rejects
--    over-redemption / inactive / expired cards. Wrapping it this way means
--    the FE doesn't have to do two writes for a gift-card tender.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_booking_payment_gift_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.method <> 'gift_card' THEN
    RETURN NEW;
  END IF;
  IF NEW.gift_card_id IS NULL THEN
    -- Caught by the CHECK constraint above, but double-belt.
    RAISE EXCEPTION 'gift_card payment requires gift_card_id';
  END IF;
  INSERT INTO public.salon_gift_card_redemptions (
    gift_card_id, store_id, booking_id, amount_cents,
    notes, redeemed_by_user_id
  ) VALUES (
    NEW.gift_card_id, NEW.store_id, NEW.booking_id, NEW.amount_cents,
    NEW.reference, NEW.recorded_by_user_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_booking_payment_gift_card ON public.salon_booking_payments;
CREATE TRIGGER salon_booking_payment_gift_card
  AFTER INSERT ON public.salon_booking_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_booking_payment_gift_card();

------------------------------------------------------------------------------
-- 3. Atomic record-and-complete RPC.
--
--    Inserts all tenders, persists tip + tax on the booking, and flips
--    status to 'completed' — all inside one Postgres transaction so a
--    partial failure (e.g. one of the gift cards is invalid) rolls
--    everything back. The FE invokes one RPC instead of chaining inserts.
--
--    p_payments shape:
--      [
--        { "method": "cash", "amount_cents": 5000 },
--        { "method": "card", "amount_cents": 2500, "reference": "•4242" },
--        { "method": "gift_card", "amount_cents": 1000, "gift_card_id": "..." }
--      ]
--
--    SECURITY INVOKER — runs as the caller, so the owner's RLS policies
--    on bookings + payments + gift_cards apply. Nothing here escalates.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.salon_record_booking_payments(
  p_booking_id UUID,
  p_tip_cents INTEGER,
  p_tax_cents INTEGER,
  p_payments JSONB
)
RETURNS TABLE (
  total_recorded_cents BIGINT,
  payment_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_status public.salon_booking_status;
  v_total_recorded BIGINT := 0;
  v_count INTEGER := 0;
  v_item JSONB;
  v_method TEXT;
  v_amount INTEGER;
  v_reference TEXT;
  v_gift_card_id UUID;
BEGIN
  SELECT store_id, status
    INTO v_store_id, v_status
    FROM public.salon_bookings
    WHERE id = p_booking_id;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'booking % not found', p_booking_id USING ERRCODE = 'P0002';
  END IF;
  IF v_status = 'cancelled' OR v_status = 'no_show' THEN
    RAISE EXCEPTION 'cannot check out a % booking', v_status USING ERRCODE = 'P0001';
  END IF;
  IF p_payments IS NULL OR jsonb_array_length(p_payments) = 0 THEN
    RAISE EXCEPTION 'at least one payment is required' USING ERRCODE = 'P0001';
  END IF;

  -- Iterate tenders. Each insert may also trigger a gift-card redemption,
  -- which can RAISE if the card is exhausted / expired / inactive — that
  -- aborts the whole transaction by design.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_method := v_item ->> 'method';
    v_amount := COALESCE((v_item ->> 'amount_cents')::INTEGER, 0);
    v_reference := NULLIF(v_item ->> 'reference', '');
    v_gift_card_id := NULLIF(v_item ->> 'gift_card_id', '')::UUID;

    IF v_amount <= 0 THEN
      RAISE EXCEPTION 'payment amount must be positive (got %)', v_amount USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.salon_booking_payments (
      store_id, booking_id, method, amount_cents,
      reference, gift_card_id, recorded_by_user_id
    ) VALUES (
      v_store_id, p_booking_id, v_method, v_amount,
      v_reference, v_gift_card_id, auth.uid()
    );

    v_total_recorded := v_total_recorded + v_amount;
    v_count := v_count + 1;
  END LOOP;

  -- Single UPDATE so the completion trigger sees tip/tax in NEW with the
  -- status flip — same pattern the SalonCheckoutDialog already relied on.
  UPDATE public.salon_bookings
    SET tip_cents = GREATEST(0, COALESCE(p_tip_cents, 0)),
        tax_cents = GREATEST(0, COALESCE(p_tax_cents, 0)),
        status = 'completed',
        updated_at = now()
    WHERE id = p_booking_id;

  RETURN QUERY SELECT v_total_recorded, v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_record_booking_payments(UUID, INTEGER, INTEGER, JSONB)
  TO authenticated;
