ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_custom_price boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscription_tiers
  DROP CONSTRAINT IF EXISTS subscription_tiers_billing_interval_check;
ALTER TABLE public.subscription_tiers
  ADD CONSTRAINT subscription_tiers_billing_interval_check
  CHECK (billing_interval IN ('month','3_months','6_months','year','lifetime'));