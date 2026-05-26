
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, display_name TEXT, bio TEXT, category TEXT,
  avatar_url TEXT, banner_url TEXT, total_earnings_cents INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0, follower_count INTEGER DEFAULT 0,
  payout_method TEXT, payout_details JSONB, is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "crp_sel" ON public.creator_profiles FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "crp_ins" ON public.creator_profiles FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "crp_upd" ON public.creator_profiles FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, name TEXT NOT NULL, description TEXT,
  price_cents INTEGER NOT NULL, currency TEXT DEFAULT 'USD',
  benefits JSONB DEFAULT '[]', max_subscribers INTEGER,
  is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "st_sel" ON public.subscription_tiers FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "st_ins" ON public.subscription_tiers FOR INSERT WITH CHECK (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "st_upd" ON public.subscription_tiers FOR UPDATE USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, subscriber_id UUID NOT NULL,
  tier_id UUID REFERENCES public.subscription_tiers(id),
  status TEXT DEFAULT 'active', price_cents INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ, payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(creator_id, subscriber_id)
);
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cs_sel" ON public.creator_subscriptions FOR SELECT USING (auth.uid() = subscriber_id OR auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cs_ins" ON public.creator_subscriptions FOR INSERT WITH CHECK (auth.uid() = subscriber_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cs_upd" ON public.creator_subscriptions FOR UPDATE USING (auth.uid() = subscriber_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, tipper_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL, currency TEXT DEFAULT 'USD',
  message TEXT, is_anonymous BOOLEAN DEFAULT false,
  payment_intent_id TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.creator_tips ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ct_sel" ON public.creator_tips FOR SELECT USING (auth.uid() = tipper_id OR auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ct_ins" ON public.creator_tips FOR INSERT WITH CHECK (auth.uid() = tipper_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.paid_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, title TEXT NOT NULL, description TEXT,
  content_type TEXT DEFAULT 'post', content_url TEXT, thumbnail_url TEXT,
  price_cents INTEGER NOT NULL, currency TEXT DEFAULT 'USD',
  preview_text TEXT, purchase_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.paid_content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pc_sel" ON public.paid_content FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pc_ins" ON public.paid_content FOR INSERT WITH CHECK (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pc_upd" ON public.paid_content FOR UPDATE USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.paid_content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.paid_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, amount_paid_cents INTEGER,
  payment_intent_id TEXT, granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, user_id)
);
ALTER TABLE public.paid_content_access ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pca_sel" ON public.paid_content_access FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pca_ins" ON public.paid_content_access FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, date DATE NOT NULL,
  subscriptions_cents INTEGER DEFAULT 0, tips_cents INTEGER DEFAULT 0,
  content_sales_cents INTEGER DEFAULT 0, ad_revenue_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id, date)
);
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ce_sel" ON public.creator_earnings FOR SELECT USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0, net_cents INTEGER NOT NULL,
  method TEXT, reference_id TEXT, status TEXT DEFAULT 'pending',
  period_start DATE, period_end DATE, paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cpay_sel" ON public.creator_payouts FOR SELECT USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, date DATE NOT NULL,
  views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0, new_followers INTEGER DEFAULT 0, new_subscribers INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0, revenue_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(creator_id, date)
);
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ca_sel" ON public.creator_analytics FOR SELECT USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.fan_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, fan_id UUID NOT NULL,
  badge_type TEXT NOT NULL, badge_name TEXT, badge_icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(), UNIQUE(creator_id, fan_id, badge_type)
);
ALTER TABLE public.fan_badges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "fb_sel" ON public.fan_badges FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "fb_ins" ON public.fan_badges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, milestone_type TEXT NOT NULL,
  milestone_value INTEGER NOT NULL, title TEXT, description TEXT,
  achieved_at TIMESTAMPTZ DEFAULT now(), is_celebrated BOOLEAN DEFAULT false,
  UNIQUE(creator_id, milestone_type, milestone_value)
);
ALTER TABLE public.creator_milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cml_sel" ON public.creator_milestones FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.creator_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL,
  icon TEXT, sort_order INTEGER DEFAULT 0, click_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.creator_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cln_sel" ON public.creator_links FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cln_ins" ON public.creator_links FOR INSERT WITH CHECK (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cln_upd" ON public.creator_links FOR UPDATE USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cln_del" ON public.creator_links FOR DELETE USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
