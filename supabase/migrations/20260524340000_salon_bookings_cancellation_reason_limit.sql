-- salon_bookings.cancellation_reason has no length constraint. The current
-- writers (public cancel RPC, auto-expire cron, owner status-change UI) all
-- produce short strings, but the column would silently accept a megabyte
-- payload from any direct SQL write or future UI feature. Add a reasonable
-- 500-char cap — matches the size of other notes columns in the same table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salon_bookings_cancellation_reason_length'
      AND conrelid = 'public.salon_bookings'::regclass
  ) THEN
    -- NOT VALID so the migration doesn't scan all existing rows. New rows
    -- enforce immediately; if any pre-existing row exceeds 500 chars we
    -- can VALIDATE later after cleanup.
    EXECUTE 'ALTER TABLE public.salon_bookings
             ADD CONSTRAINT salon_bookings_cancellation_reason_length
             CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500)
             NOT VALID';
  END IF;
END $$;

-- Mark VALID if no rows violate. Safe because all current writers stay well
-- under 500 chars.
ALTER TABLE public.salon_bookings
  VALIDATE CONSTRAINT salon_bookings_cancellation_reason_length;
