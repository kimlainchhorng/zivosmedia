ALTER TABLE public.lodge_reservations
  ADD COLUMN IF NOT EXISTS policy_consent jsonb,
  ADD COLUMN IF NOT EXISTS policy_consent_version text,
  ADD COLUMN IF NOT EXISTS last_payment_error text;