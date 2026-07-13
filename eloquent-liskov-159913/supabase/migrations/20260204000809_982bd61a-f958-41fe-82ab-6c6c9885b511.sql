-- ============================================
-- ZIVO AI Personalization, Retention & Optimization Engine
-- (Excluding loyalty_transactions which already exists)
-- ============================================

-- 1. User Personalization Settings
CREATE TABLE public.user_personalization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  personalization_enabled BOOLEAN NOT NULL DEFAULT true,
  show_price_badges BOOLEAN NOT NULL DEFAULT true,
  show_urgency_indicators BOOLEAN NOT NULL DEFAULT true,
  allow_search_history BOOLEAN NOT NULL DEFAULT true,
  allow_recently_viewed BOOLEAN NOT NULL DEFAULT true,
  preferred_currency TEXT DEFAULT 'USD',
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. User Saved Searches (dynamic)
CREATE TABLE public.user_saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('flights', 'hotels', 'cars', 'activities', 'transfers')),
  title TEXT NOT NULL,
  search_params JSONB NOT NULL DEFAULT '{}',
  price_alert_enabled BOOLEAN NOT NULL DEFAULT false,
  target_price NUMERIC(12,2),
  current_price NUMERIC(12,2),
  last_price_check_at TIMESTAMP WITH TIME ZONE,
  notification_email BOOLEAN NOT NULL DEFAULT true,
  notification_push BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. User Favorites
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('hotel', 'activity', 'flight_route', 'car', 'transfer')),
  item_id TEXT NOT NULL,
  item_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- 4. User Recently Viewed
CREATE TABLE public.user_recently_viewed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('hotel', 'activity', 'flight', 'car', 'transfer')),
  item_id TEXT NOT NULL,
  item_data JSONB NOT NULL DEFAULT '{}',
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Smart Sort Rules (Admin configurable)
CREATE TABLE public.smart_sort_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('flights', 'hotels', 'cars', 'activities', 'transfers')),
  rule_name TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  description TEXT,
  scoring_weights JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_type, rule_key)
);

-- 6. Price Intelligence Cache
CREATE TABLE public.price_intelligence_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('flights', 'hotels', 'cars', 'activities', 'transfers')),
  item_id TEXT NOT NULL,
  current_price NUMERIC(12,2) NOT NULL,
  historical_avg NUMERIC(12,2),
  historical_low NUMERIC(12,2),
  demand_level TEXT CHECK (demand_level IN ('low', 'normal', 'high', 'very_high')),
  availability_level TEXT CHECK (availability_level IN ('high', 'medium', 'low', 'limited')),
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_type, item_id)
);

-- 7. Optimization Metrics (Admin analytics)
CREATE TABLE public.optimization_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_type TEXT NOT NULL,
  segment_value TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12,4) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Loyalty Points
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'bronze', 'silver', 'gold')),
  tier_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_user_saved_searches_user ON public.user_saved_searches(user_id);
CREATE INDEX idx_user_saved_searches_service ON public.user_saved_searches(service_type);
CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_type ON public.user_favorites(item_type);
CREATE INDEX idx_user_recently_viewed_user ON public.user_recently_viewed(user_id);
CREATE INDEX idx_user_recently_viewed_time ON public.user_recently_viewed(viewed_at DESC);
CREATE INDEX idx_price_intelligence_item ON public.price_intelligence_cache(service_type, item_id);
CREATE INDEX idx_optimization_metrics_segment ON public.optimization_metrics(segment_type, segment_value);
CREATE INDEX idx_optimization_metrics_period ON public.optimization_metrics(period_start, period_end);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.user_personalization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_sort_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- User personalization settings: users can manage their own
CREATE POLICY "Users can view own personalization settings"
  ON public.user_personalization_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personalization settings"
  ON public.user_personalization_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personalization settings"
  ON public.user_personalization_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Saved searches: users can manage their own
CREATE POLICY "Users can view own saved searches"
  ON public.user_saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved searches"
  ON public.user_saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON public.user_saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON public.user_saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Favorites: users can manage their own
CREATE POLICY "Users can view own favorites"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Recently viewed: users can manage their own
CREATE POLICY "Users can view own recently viewed"
  ON public.user_recently_viewed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recently viewed"
  ON public.user_recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recently viewed"
  ON public.user_recently_viewed FOR DELETE
  USING (auth.uid() = user_id);

-- Smart sort rules: public read, admin write
CREATE POLICY "Anyone can view active sort rules"
  ON public.smart_sort_rules FOR SELECT
  USING (is_active = true);

-- Price intelligence: public read
CREATE POLICY "Anyone can view price intelligence"
  ON public.price_intelligence_cache FOR SELECT
  USING (true);

-- Optimization metrics: admin only
CREATE POLICY "Admins can view optimization metrics"
  ON public.optimization_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Loyalty points: users can view their own
CREATE POLICY "Users can view own loyalty points"
  ON public.loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty points"
  ON public.loyalty_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty points"
  ON public.loyalty_points FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Seed Smart Sort Rules
-- ============================================

INSERT INTO public.smart_sort_rules (service_type, rule_name, rule_key, description, scoring_weights, is_default) VALUES
('hotels', 'Best Value', 'best_value', 'Balanced score of price, rating, and cancellation flexibility', '{"price": 0.4, "rating": 0.35, "cancellation": 0.25}', true),
('hotels', 'Most Popular', 'most_booked', 'Ranked by booking popularity', '{"bookings": 0.6, "rating": 0.3, "reviews": 0.1}', false),
('hotels', 'Best Flexibility', 'best_flexibility', 'Prioritizes free cancellation and refundable options', '{"cancellation": 0.6, "rating": 0.25, "price": 0.15}', false),
('hotels', 'Closest Match', 'closest_match', 'Personalized to user preferences', '{"affinity": 0.5, "rating": 0.3, "price": 0.2}', false),
('flights', 'Best Value', 'best_value', 'Balanced score of price and convenience', '{"price": 0.5, "duration": 0.3, "stops": 0.2}', true),
('flights', 'Fastest', 'fastest', 'Shortest travel time', '{"duration": 0.6, "stops": 0.3, "price": 0.1}', false),
('flights', 'Cheapest', 'cheapest', 'Lowest price first', '{"price": 0.8, "duration": 0.15, "stops": 0.05}', false),
('cars', 'Best Value', 'best_value', 'Best combination of price and features', '{"price": 0.45, "rating": 0.35, "features": 0.2}', true),
('cars', 'Most Popular', 'most_booked', 'Most frequently rented', '{"bookings": 0.6, "rating": 0.3, "price": 0.1}', false),
('activities', 'Best Value', 'best_value', 'Balanced price and ratings', '{"price": 0.4, "rating": 0.4, "reviews": 0.2}', true),
('activities', 'Top Rated', 'top_rated', 'Highest rated experiences', '{"rating": 0.6, "reviews": 0.3, "price": 0.1}', false),
('transfers', 'Best Value', 'best_value', 'Best combination of price and reliability', '{"price": 0.5, "rating": 0.35, "vehicle": 0.15}', true);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE TRIGGER update_user_personalization_settings_updated_at
  BEFORE UPDATE ON public.user_personalization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_saved_searches_updated_at
  BEFORE UPDATE ON public.user_saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_sort_rules_updated_at
  BEFORE UPDATE ON public.smart_sort_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();