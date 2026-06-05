-- ZIVO+ end-to-end membership hardening.
-- Stores the actual product tier synced from Stripe metadata and ensures the
-- plan table remains readable through the Supabase Data API with RLS enabled.

ALTER TABLE public.zivo_subscriptions
  ADD COLUMN IF NOT EXISTS plan_code TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE public.zivo_subscriptions
  DROP CONSTRAINT IF EXISTS zivo_subscriptions_plan_code_check;

ALTER TABLE public.zivo_subscriptions
  ADD CONSTRAINT zivo_subscriptions_plan_code_check
  CHECK (plan_code IN ('monthly', 'chat', 'pro', 'annual'));

UPDATE public.zivo_subscriptions
SET plan_code = CASE
  WHEN billing_cycle = 'yearly' THEN 'annual'
  ELSE 'monthly'
END
WHERE plan_code IS NULL OR plan_code = '';

CREATE INDEX IF NOT EXISTS idx_zivo_subscriptions_user_status_period
  ON public.zivo_subscriptions (user_id, status, current_period_end DESC);

CREATE INDEX IF NOT EXISTS idx_zivo_subscriptions_plan_code
  ON public.zivo_subscriptions (plan_code);

ALTER TABLE public.zivo_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscription plans are viewable" ON public.zivo_subscription_plans;
CREATE POLICY "Subscription plans are viewable"
  ON public.zivo_subscription_plans
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.zivo_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.zivo_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.zivo_subscriptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.zivo_subscription_plans TO anon, authenticated;
GRANT SELECT ON TABLE public.zivo_subscriptions TO authenticated;

UPDATE public.zivo_subscription_plans
SET
  name = 'ZIVO+',
  description = 'Skip service fees, unlock priority delivery, and get member-only perks across ZIVO.',
  price_monthly = 9.99,
  price_yearly = 79.99,
  delivery_fee_discount_pct = 100,
  service_fee_discount_pct = 100,
  free_delivery_min_order = 0,
  fee_reduction_pct = 100,
  priority_support = true,
  benefits = jsonb_build_object(
    'service_fee_waived', true,
    'priority_delivery', true,
    'extended_guarantee_hours', 48,
    'exclusive_deals', true,
    'monthly_perks', true,
    'chat_plus_available', true,
    'pro_available', true,
    'tiers', jsonb_build_object(
      'monthly', jsonb_build_object('price', 9.99, 'period', 'mo', 'name', 'Basic'),
      'annual', jsonb_build_object('price', 79.99, 'period', 'yr', 'name', 'Annual', 'savings', 'Save 33%'),
      'chat', jsonb_build_object('price', 15.99, 'period', 'mo', 'name', 'Chat+', 'badge', 'Popular'),
      'pro', jsonb_build_object('price', 29.99, 'period', 'mo', 'name', 'Pro', 'badge', 'Best')
    )
  ),
  is_active = true
WHERE slug = 'zivo-plus';
