-- ZIVO Unified Monetization & Revenue Engine
-- Centralized commission, payouts, promotions, and revenue tracking

-- =============================================
-- 1) GLOBAL COMMISSION ENGINE
-- =============================================

-- Service-level default commissions
CREATE TABLE IF NOT EXISTS public.zivo_service_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL UNIQUE CHECK (service_type IN ('flights', 'cars', 'p2p_cars', 'rides', 'eats', 'move', 'hotels')),
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'margin')),
  commission_value NUMERIC(8,4) NOT NULL DEFAULT 0,
  min_commission NUMERIC(10,2) DEFAULT 0,
  max_commission NUMERIC(10,2),
  service_fee NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Partner-specific commission overrides
CREATE TABLE IF NOT EXISTS public.zivo_partner_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('driver', 'car_owner', 'fleet', 'restaurant', 'hotel')),
  partner_id UUID NOT NULL,
  service_type TEXT NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_value NUMERIC(8,4) NOT NULL,
  min_commission NUMERIC(10,2) DEFAULT 0,
  max_commission NUMERIC(10,2),
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  effective_until TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(partner_type, partner_id, service_type)
);

-- =============================================
-- 2) PAYOUT SCHEDULING SYSTEM
-- =============================================

-- Payout schedule configurations
CREATE TABLE IF NOT EXISTS public.zivo_payout_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_type TEXT NOT NULL UNIQUE CHECK (partner_type IN ('driver', 'car_owner', 'fleet', 'restaurant')),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('instant', 'daily', 'weekly', 'biweekly', 'monthly', 'on_completion')),
  day_of_week INTEGER, -- 0=Sunday for weekly
  day_of_month INTEGER, -- for monthly
  min_payout_amount NUMERIC(10,2) DEFAULT 0,
  hold_period_hours INTEGER DEFAULT 0, -- hours to hold before payout
  auto_payout BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual payouts
CREATE TABLE IF NOT EXISTS public.zivo_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_type TEXT NOT NULL,
  partner_id UUID NOT NULL,
  payout_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  payout_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  gross_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_deducted NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustments NUMERIC(12,2) DEFAULT 0,
  net_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payout line items (for detail view)
CREATE TABLE IF NOT EXISTS public.zivo_payout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id UUID NOT NULL REFERENCES public.zivo_payouts(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  reference_type TEXT NOT NULL, -- trip, order, booking, rental
  reference_id UUID NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 3) PROMOTIONS & DISCOUNTS ENGINE
-- =============================================

-- Promo campaigns
CREATE TABLE IF NOT EXISTS public.zivo_promo_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('coupon', 'first_time', 'referral', 'seasonal', 'partner', 'loyalty')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery', 'cashback')),
  discount_value NUMERIC(10,2) NOT NULL,
  max_discount NUMERIC(10,2),
  min_order_value NUMERIC(10,2) DEFAULT 0,
  services TEXT[] DEFAULT ARRAY['all'], -- ['flights', 'cars'] or ['all']
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  budget_cap NUMERIC(12,2),
  budget_used NUMERIC(12,2) DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  requires_code BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Promo codes (linked to campaigns)
CREATE TABLE IF NOT EXISTS public.zivo_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.zivo_promo_campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Promo redemptions
CREATE TABLE IF NOT EXISTS public.zivo_promo_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.zivo_promo_campaigns(id),
  code_id UUID REFERENCES public.zivo_promo_codes(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  original_amount NUMERIC(12,2) NOT NULL,
  discount_applied NUMERIC(12,2) NOT NULL,
  final_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 4) SUBSCRIPTION PREPARATION (ZIVO PLUS)
-- =============================================

CREATE TABLE IF NOT EXISTS public.zivo_subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2),
  benefits JSONB DEFAULT '{}',
  fee_reduction_pct NUMERIC(5,2) DEFAULT 0,
  priority_support BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false, -- Not active yet
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zivo_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.zivo_subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_subscription_id TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 5) REVENUE TRACKING (ZIVO EARNINGS)
-- =============================================

CREATE TABLE IF NOT EXISTS public.zivo_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('commission', 'service_fee', 'subscription', 'promo_partner', 'other')),
  reference_type TEXT,
  reference_id UUID,
  partner_type TEXT,
  partner_id UUID,
  gross_transaction NUMERIC(12,2) NOT NULL,
  zivo_revenue NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily revenue aggregates for fast reporting
CREATE TABLE IF NOT EXISTS public.zivo_revenue_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  total_gmv NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_commissions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_service_fees NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_subscriptions NUMERIC(14,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_date, service_type)
);

-- =============================================
-- 6) ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.zivo_service_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_payout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_revenue_daily ENABLE ROW LEVEL SECURITY;

-- Public read for service commissions and plans
CREATE POLICY "Service commissions are viewable" ON public.zivo_service_commissions FOR SELECT USING (true);
CREATE POLICY "Subscription plans are viewable" ON public.zivo_subscription_plans FOR SELECT USING (is_active = true);

-- User policies for subscriptions and redemptions
CREATE POLICY "Users can view own subscriptions" ON public.zivo_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own redemptions" ON public.zivo_promo_redemptions FOR SELECT USING (auth.uid() = user_id);

-- Promo codes viewable for validation
CREATE POLICY "Active promo codes are viewable" ON public.zivo_promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Active promo campaigns are viewable" ON public.zivo_promo_campaigns FOR SELECT USING (is_active = true);

-- Partners can view their payouts
CREATE POLICY "Partners can view own payouts" ON public.zivo_payouts FOR SELECT USING (partner_id = auth.uid());
CREATE POLICY "Partners can view own payout items" ON public.zivo_payout_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.zivo_payouts p WHERE p.id = payout_id AND p.partner_id = auth.uid())
);

-- =============================================
-- 7) INDEXES
-- =============================================

CREATE INDEX idx_zivo_partner_commissions_partner ON public.zivo_partner_commissions(partner_type, partner_id);
CREATE INDEX idx_zivo_payouts_partner ON public.zivo_payouts(partner_type, partner_id);
CREATE INDEX idx_zivo_payouts_status ON public.zivo_payouts(status);
CREATE INDEX idx_zivo_payout_items_payout ON public.zivo_payout_items(payout_id);
CREATE INDEX idx_zivo_promo_codes_code ON public.zivo_promo_codes(code);
CREATE INDEX idx_zivo_promo_redemptions_user ON public.zivo_promo_redemptions(user_id);
CREATE INDEX idx_zivo_subscriptions_user ON public.zivo_subscriptions(user_id);
CREATE INDEX idx_zivo_revenue_date ON public.zivo_revenue(period_date);
CREATE INDEX idx_zivo_revenue_service ON public.zivo_revenue(service_type);
CREATE INDEX idx_zivo_revenue_daily_date ON public.zivo_revenue_daily(report_date);

-- =============================================
-- 8) SEED DEFAULT COMMISSIONS
-- =============================================

INSERT INTO public.zivo_service_commissions (service_type, commission_type, commission_value, service_fee, notes)
VALUES 
  ('flights', 'margin', 0, 9.99, 'Fixed service fee per booking'),
  ('cars', 'percentage', 15.00, 0, '15% commission on car rentals'),
  ('p2p_cars', 'percentage', 20.00, 0, '20% commission on P2P car sharing'),
  ('rides', 'percentage', 25.00, 0, '25% commission on rides'),
  ('eats', 'percentage', 25.00, 0, '25% commission on food orders'),
  ('move', 'percentage', 20.00, 0, '20% commission on deliveries'),
  ('hotels', 'margin', 0, 0, 'Affiliate margin from partners')
ON CONFLICT (service_type) DO NOTHING;

-- Seed payout schedules
INSERT INTO public.zivo_payout_schedules (partner_type, schedule_type, day_of_week, hold_period_hours)
VALUES
  ('driver', 'daily', NULL, 24),
  ('car_owner', 'on_completion', NULL, 48),
  ('fleet', 'weekly', 1, 0),
  ('restaurant', 'weekly', 1, 0)
ON CONFLICT (partner_type) DO NOTHING;

-- Seed ZIVO Plus plan (inactive)
INSERT INTO public.zivo_subscription_plans (name, slug, price_monthly, price_yearly, fee_reduction_pct, priority_support, benefits, is_active)
VALUES (
  'ZIVO Plus',
  'zivo-plus',
  14.99,
  149.99,
  10.00,
  true,
  '{"free_delivery": true, "exclusive_deals": true, "priority_support": true, "fee_discount": 10}',
  false
) ON CONFLICT (slug) DO NOTHING;