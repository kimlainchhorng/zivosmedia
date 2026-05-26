ALTER TABLE public.lodge_reservations
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS deposit_cents integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lodge_reservations_stripe_session
  ON public.lodge_reservations(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;