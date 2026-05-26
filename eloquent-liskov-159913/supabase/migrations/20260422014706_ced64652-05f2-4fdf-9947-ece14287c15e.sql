-- Phase 4 Pass 2: schema additions for automations, campaigns, indexes

ALTER TABLE public.marketing_automations
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_tick_at timestamptz;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo
  ON public.marketing_promo_redemptions (promo_code_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user
  ON public.marketing_promo_redemptions (user_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_automations_active
  ON public.marketing_automations (store_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
  ON public.marketing_campaigns (status, next_run_at);
