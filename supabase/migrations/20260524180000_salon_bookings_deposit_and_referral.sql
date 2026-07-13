-- Two follow-on columns on salon_bookings that exist in production but
-- weren't in the original 20260524050000_salon_bookings.sql:
--
--   deposit_paid_cents — how much of the deposit the client has actually paid,
--   separate from deposit_cents (the amount asked for). Used by the
--   DepositControl widget on each booking row.
--
--   referral_source — free-text "how did you hear about us?". Surfaced in the
--   create/edit dialog and rolled up by the dashboard's referral card.

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS deposit_paid_cents INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_paid_cents >= 0);

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS referral_source TEXT
    CHECK (referral_source IS NULL OR char_length(referral_source) <= 120);

CREATE INDEX IF NOT EXISTS salon_bookings_referral_source_idx
  ON public.salon_bookings (store_id, referral_source)
  WHERE referral_source IS NOT NULL;
