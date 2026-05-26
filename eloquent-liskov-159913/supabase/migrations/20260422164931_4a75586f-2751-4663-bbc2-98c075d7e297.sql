-- 1. Defaults / NOT NULL on money columns
UPDATE public.lodge_reservations SET extras_cents = 0 WHERE extras_cents IS NULL;
UPDATE public.lodge_reservations SET tax_cents = 0 WHERE tax_cents IS NULL;
UPDATE public.lodge_reservations SET paid_cents = 0 WHERE paid_cents IS NULL;

ALTER TABLE public.lodge_reservations
  ALTER COLUMN extras_cents SET DEFAULT 0,
  ALTER COLUMN extras_cents SET NOT NULL,
  ALTER COLUMN tax_cents    SET DEFAULT 0,
  ALTER COLUMN tax_cents    SET NOT NULL,
  ALTER COLUMN paid_cents   SET DEFAULT 0,
  ALTER COLUMN paid_cents   SET NOT NULL;

-- 2. Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lodge_reservations_room_id_fkey'
      AND conrelid = 'public.lodge_reservations'::regclass
  ) THEN
    ALTER TABLE public.lodge_reservations
      ADD CONSTRAINT lodge_reservations_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES public.lodge_rooms(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lodge_reservation_audit_reservation_id_fkey'
      AND conrelid = 'public.lodge_reservation_audit'::regclass
  ) THEN
    ALTER TABLE public.lodge_reservation_audit
      ADD CONSTRAINT lodge_reservation_audit_reservation_id_fkey
      FOREIGN KEY (reservation_id) REFERENCES public.lodge_reservations(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_lodge_reservations_store_status_checkin
  ON public.lodge_reservations(store_id, status, check_in);

CREATE INDEX IF NOT EXISTS idx_lodge_reservations_stripe_pi
  ON public.lodge_reservations(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lodge_reservation_audit_reservation
  ON public.lodge_reservation_audit(reservation_id, created_at DESC);