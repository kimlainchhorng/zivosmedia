ALTER TABLE public.lodge_property_profile
  ADD COLUMN IF NOT EXISTS check_in_from text,
  ADD COLUMN IF NOT EXISTS check_in_until text,
  ADD COLUMN IF NOT EXISTS check_out_from text,
  ADD COLUMN IF NOT EXISTS check_out_until text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS cancellation_window_hours integer,
  ADD COLUMN IF NOT EXISTS pet_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS child_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS currencies_accepted text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_percent integer;

UPDATE public.lodge_property_profile
SET check_in_from = COALESCE(check_in_from, '15:00'),
    check_in_until = COALESCE(check_in_until, '23:00'),
    check_out_from = COALESCE(check_out_from, '07:00'),
    check_out_until = COALESCE(check_out_until, '11:00');