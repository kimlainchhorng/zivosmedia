ALTER TABLE public.customer_payout_methods
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_note text;

ALTER TABLE public.lodge_payout_requests
  ADD COLUMN IF NOT EXISTS failure_reason text;

CREATE INDEX IF NOT EXISTS idx_customer_payout_methods_verification
  ON public.customer_payout_methods(verification_status);