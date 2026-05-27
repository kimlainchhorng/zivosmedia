-- =============================================
-- ZIVO AI OPTIMIZATION & PERSONALIZATION SCHEMA
-- =============================================

-- 1) USER BEHAVIOR TRACKING for personalization
CREATE TABLE IF NOT EXISTS public.user_behavior_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  service_type TEXT NOT NULL, -- 'flights', 'cars', 'rides', 'eats', 'move'
  signal_type TEXT NOT NULL, -- 'search', 'view', 'click', 'book', 'cancel', 'review'
  entity_id TEXT, -- ID of the item interacted with
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) AI SEARCH RANKINGS - personalized result scoring
CREATE TABLE IF NOT EXISTS public.ai_search_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  search_params JSONB NOT NULL,
  rankings JSONB NOT NULL, -- Array of {entity_id, score, factors}
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) DYNAMIC PRICING SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.ai_pricing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL, -- 'car_owner', 'driver', 'restaurant'
  target_id UUID NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'increase', 'decrease', 'surge', 'promotion'
  current_value DECIMAL(10,2),
  suggested_value DECIMAL(10,2),
  reason TEXT NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  factors JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) CROSS-SERVICE RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_service TEXT NOT NULL,
  source_booking_id TEXT,
  recommended_service TEXT NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'post_booking', 'complementary', 'upsell'
  context JSONB DEFAULT '{}',
  relevance_score DECIMAL(3,2), -- 0.00 to 1.00
  is_shown BOOLEAN DEFAULT false,
  shown_at TIMESTAMPTZ,
  is_clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  is_converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) FRAUD & RISK DETECTION
CREATE TABLE IF NOT EXISTS public.ai_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'suspicious_booking', 'payment_fraud', 'account_takeover', 'abuse'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT, -- 'booking', 'payment', 'account'
  entity_id TEXT,
  risk_score DECIMAL(3,2), -- 0.00 to 1.00
  indicators JSONB NOT NULL, -- What triggered the alert
  model_version TEXT DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewing', 'confirmed', 'dismissed'
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) CUSTOMER LIFETIME VALUE
CREATE TABLE IF NOT EXISTS public.user_clv_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  clv_score DECIMAL(12,2) NOT NULL DEFAULT 0, -- Estimated lifetime value in USD
  clv_tier TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'bronze', 'silver', 'gold', 'platinum'
  total_bookings INT DEFAULT 0,
  total_spend DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  booking_frequency DECIMAL(5,2) DEFAULT 0, -- Bookings per month
  churn_risk DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
  last_activity_at TIMESTAMPTZ,
  factors JSONB DEFAULT '{}',
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) PARTNER PERFORMANCE INSIGHTS
CREATE TABLE IF NOT EXISTS public.ai_partner_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_type TEXT NOT NULL, -- 'car_owner', 'driver', 'fleet', 'restaurant'
  partner_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'performance', 'opportunity', 'warning', 'tip'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_name TEXT,
  current_value DECIMAL(10,2),
  benchmark_value DECIMAL(10,2),
  impact_estimate TEXT, -- e.g., "+15% bookings"
  priority INT DEFAULT 5, -- 1-10
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) AI MODEL PERFORMANCE TRACKING
CREATE TABLE IF NOT EXISTS public.ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL, -- 'search_ranking', 'pricing', 'fraud', 'clv', 'recommendations'
  model_version TEXT NOT NULL,
  metric_name TEXT NOT NULL, -- 'accuracy', 'precision', 'recall', 'conversion_lift'
  metric_value DECIMAL(10,4),
  sample_size INT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_behavior_user ON public.user_behavior_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_service ON public.user_behavior_signals(service_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_created ON public.user_behavior_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_rankings_user ON public.ai_search_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_target ON public.ai_pricing_suggestions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_status ON public.ai_pricing_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_recs_user ON public.ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_source ON public.ai_recommendations(source_service);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_status ON public.ai_fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_ai_fraud_severity ON public.ai_fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_user_clv_tier ON public.user_clv_scores(clv_tier);
CREATE INDEX IF NOT EXISTS idx_ai_insights_partner ON public.ai_partner_insights(partner_type, partner_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics ON public.ai_model_metrics(model_name, model_version);

-- Enable RLS
ALTER TABLE public.user_behavior_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_search_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clv_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_partner_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User behavior: users can read own, system can write
CREATE POLICY "Users can read own behavior" ON public.user_behavior_signals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert behavior" ON public.user_behavior_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read all behavior" ON public.user_behavior_signals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Search rankings: users can read own
CREATE POLICY "Users can read own rankings" ON public.ai_search_rankings FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "System can manage rankings" ON public.ai_search_rankings FOR ALL WITH CHECK (true);

-- Pricing suggestions: partners can read their own
CREATE POLICY "Partners can read own pricing suggestions" ON public.ai_pricing_suggestions FOR SELECT TO authenticated USING (target_id = auth.uid());
CREATE POLICY "Partners can update own suggestions" ON public.ai_pricing_suggestions FOR UPDATE TO authenticated USING (target_id = auth.uid());
CREATE POLICY "Admins can manage pricing suggestions" ON public.ai_pricing_suggestions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Recommendations: users can read own
CREATE POLICY "Users can read own recommendations" ON public.ai_recommendations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can manage recommendations" ON public.ai_recommendations FOR ALL WITH CHECK (true);

-- Fraud alerts: admin only
CREATE POLICY "Admins can manage fraud alerts" ON public.ai_fraud_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- CLV scores: users can read own, admin can see all
CREATE POLICY "Users can read own CLV" ON public.user_clv_scores FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage CLV" ON public.user_clv_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Partner insights: partners read own
CREATE POLICY "Partners can read own insights" ON public.ai_partner_insights FOR SELECT TO authenticated USING (partner_id = auth.uid());
CREATE POLICY "Partners can update own insights" ON public.ai_partner_insights FOR UPDATE TO authenticated USING (partner_id = auth.uid());
CREATE POLICY "Admins can manage insights" ON public.ai_partner_insights FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Model metrics: admin only
CREATE POLICY "Admins can read model metrics" ON public.ai_model_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can write model metrics" ON public.ai_model_metrics FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_user_clv_updated_at BEFORE UPDATE ON public.user_clv_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function for CLV tier calculation
CREATE OR REPLACE FUNCTION public.calculate_clv_tier(p_clv_score DECIMAL)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_clv_score >= 10000 THEN 'platinum'
    WHEN p_clv_score >= 5000 THEN 'gold'
    WHEN p_clv_score >= 2000 THEN 'silver'
    WHEN p_clv_score >= 500 THEN 'bronze'
    ELSE 'standard'
  END;
$$;