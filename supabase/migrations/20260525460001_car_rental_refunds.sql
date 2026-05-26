-- Car rental — refund tracking on cancelled reservations.

ALTER TABLE public.car_rental_reservations
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (refund_amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS refund_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_method TEXT
    CHECK (refund_method IS NULL OR refund_method IN ('original_payment', 'cash', 'store_credit', 'other'));

CREATE INDEX IF NOT EXISTS car_rental_reservations_refund_idx
  ON public.car_rental_reservations (store_id, refund_at DESC)
  WHERE refund_at IS NOT NULL;
