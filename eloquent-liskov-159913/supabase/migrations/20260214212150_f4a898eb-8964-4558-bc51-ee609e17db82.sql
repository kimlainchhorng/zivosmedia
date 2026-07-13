-- Add stripe_payment_intent_id to jobs for manual capture flow
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS cancel_reason text,
ADD COLUMN IF NOT EXISTS cancel_fee_cents integer;

-- Index for quick lookup by PI id
CREATE INDEX IF NOT EXISTS idx_jobs_stripe_pi ON public.jobs (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;