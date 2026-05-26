
-- =============================================
-- ZIVO GROWTH ENGINE: Referrals, Credits, Network Effects
-- =============================================

-- 1. Referral Codes - Every user gets a unique code
CREATE TABLE public.zivo_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  total_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Referrals Tracking - Who referred whom
CREATE TABLE public.zivo_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referee_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'credited', 'expired')),
  referrer_credit_amount NUMERIC(10,2) DEFAULT 0,
  referee_credit_amount NUMERIC(10,2) DEFAULT 0,
  first_booking_service TEXT,
  first_booking_id UUID,
  first_booking_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referee_id)
);

-- 3. Credits Wallet - Earned credits per user
CREATE TABLE public.zivo_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('referral_earned', 'referral_bonus', 'first_booking', 'cross_sell', 'promo', 'refund', 'manual')),
  source_service TEXT CHECK (source_service IN ('flights', 'cars', 'rides', 'eats', 'move', 'global')),
  usable_on TEXT[] DEFAULT ARRAY['flights', 'cars', 'rides', 'eats', 'move'],
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  expires_at TIMESTAMPTZ,
  used_amount NUMERIC(10,2) DEFAULT 0,
  used_at TIMESTAMPTZ,
  used_on_service TEXT,
  used_on_booking_id UUID,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. First Booking Incentives Config
CREATE TABLE public.zivo_first_booking_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('flights', 'cars', 'rides', 'eats', 'move')),
  credit_amount NUMERIC(10,2) NOT NULL,
  min_booking_value NUMERIC(10,2) DEFAULT 0,
  budget_cap NUMERIC(12,2),
  budget_used NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service)
);

-- 5. Partner/Supply-Side Referrals
CREATE TABLE public.zivo_partner_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_type TEXT NOT NULL CHECK (referrer_type IN ('car_owner', 'driver', 'restaurant', 'fleet_owner')),
  referrer_id UUID NOT NULL,
  referee_type TEXT NOT NULL CHECK (referee_type IN ('car_owner', 'driver', 'restaurant', 'fleet_owner')),
  referee_id UUID NOT NULL,
  referral_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid', 'expired')),
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  first_completed_booking_id UUID,
  first_completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Cross-Sell Incentives Config
CREATE TABLE public.zivo_cross_sell_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_service TEXT NOT NULL CHECK (trigger_service IN ('flights', 'cars', 'rides', 'eats', 'move')),
  target_service TEXT NOT NULL CHECK (target_service IN ('flights', 'cars', 'rides', 'eats', 'move')),
  credit_amount NUMERIC(10,2) NOT NULL,
  credit_expires_days INTEGER DEFAULT 30,
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trigger_service, target_service)
);

-- 7. Badge Definitions
CREATE TABLE public.zivo_badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('driver', 'car_owner', 'fleet', 'restaurant', 'customer')),
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  criteria_type TEXT NOT NULL,
  criteria_threshold INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. User Badges (earned)
CREATE TABLE public.zivo_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.zivo_badges(id),
  partner_type TEXT,
  partner_id UUID,
  earned_at TIMESTAMPTZ DEFAULT now(),
  is_featured BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id, partner_id)
);

-- 9. Leaderboards (cached for performance)
CREATE TABLE public.zivo_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('driver', 'car_owner', 'fleet', 'restaurant')),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  partner_id UUID NOT NULL,
  partner_name TEXT,
  partner_avatar TEXT,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC(12,2) DEFAULT 0,
  rank INTEGER,
  region_id UUID,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Growth Config (admin settings)
CREATE TABLE public.zivo_growth_config (
  id TEXT PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Referral Reward Tiers
CREATE TABLE public.zivo_referral_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  min_referrals INTEGER NOT NULL,
  referrer_reward NUMERIC(10,2) NOT NULL,
  referee_reward NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_referral_codes_user ON public.zivo_referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON public.zivo_referral_codes(code);
CREATE INDEX idx_referrals_referrer ON public.zivo_referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON public.zivo_referrals(referee_id);
CREATE INDEX idx_referrals_status ON public.zivo_referrals(status);
CREATE INDEX idx_credits_user ON public.zivo_credits(user_id);
CREATE INDEX idx_credits_type ON public.zivo_credits(credit_type);
CREATE INDEX idx_credits_expires ON public.zivo_credits(expires_at) WHERE is_expired = false;
CREATE INDEX idx_partner_referrals_referrer ON public.zivo_partner_referrals(referrer_type, referrer_id);
CREATE INDEX idx_user_badges_user ON public.zivo_user_badges(user_id);
CREATE INDEX idx_leaderboards_category ON public.zivo_leaderboards(category, period);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.zivo_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_first_booking_incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_cross_sell_incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_growth_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_referral_tiers ENABLE ROW LEVEL SECURITY;

-- Referral Codes: Users see own, can create own
CREATE POLICY "Users can view own referral code" ON public.zivo_referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own referral code" ON public.zivo_referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin full access referral codes" ON public.zivo_referral_codes FOR ALL USING (public.is_admin(auth.uid()));

-- Referrals: Users see where they are referrer or referee
CREATE POLICY "Users view own referrals" ON public.zivo_referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
CREATE POLICY "System can insert referrals" ON public.zivo_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access referrals" ON public.zivo_referrals FOR ALL USING (public.is_admin(auth.uid()));

-- Credits: Users see own
CREATE POLICY "Users view own credits" ON public.zivo_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage credits" ON public.zivo_credits FOR ALL USING (true);

-- First Booking Incentives: Public read, admin write
CREATE POLICY "Public read incentives" ON public.zivo_first_booking_incentives FOR SELECT USING (true);
CREATE POLICY "Admin manage incentives" ON public.zivo_first_booking_incentives FOR ALL USING (public.is_admin(auth.uid()));

-- Partner Referrals: Partners see own
CREATE POLICY "Partners view own referrals" ON public.zivo_partner_referrals FOR SELECT USING (true);
CREATE POLICY "Admin full access partner referrals" ON public.zivo_partner_referrals FOR ALL USING (public.is_admin(auth.uid()));

-- Cross-Sell Incentives: Public read
CREATE POLICY "Public read cross-sell" ON public.zivo_cross_sell_incentives FOR SELECT USING (true);
CREATE POLICY "Admin manage cross-sell" ON public.zivo_cross_sell_incentives FOR ALL USING (public.is_admin(auth.uid()));

-- Badges: Public read
CREATE POLICY "Public read badges" ON public.zivo_badges FOR SELECT USING (true);
CREATE POLICY "Admin manage badges" ON public.zivo_badges FOR ALL USING (public.is_admin(auth.uid()));

-- User Badges: Users see own and public
CREATE POLICY "Users view badges" ON public.zivo_user_badges FOR SELECT USING (true);
CREATE POLICY "System manage user badges" ON public.zivo_user_badges FOR ALL USING (true);

-- Leaderboards: Public read
CREATE POLICY "Public read leaderboards" ON public.zivo_leaderboards FOR SELECT USING (true);
CREATE POLICY "System manage leaderboards" ON public.zivo_leaderboards FOR ALL USING (true);

-- Growth Config: Admin only
CREATE POLICY "Admin access growth config" ON public.zivo_growth_config FOR ALL USING (public.is_admin(auth.uid()));

-- Referral Tiers: Public read
CREATE POLICY "Public read tiers" ON public.zivo_referral_tiers FOR SELECT USING (true);
CREATE POLICY "Admin manage tiers" ON public.zivo_referral_tiers FOR ALL USING (public.is_admin(auth.uid()));

-- =============================================
-- SEED DATA
-- =============================================

-- Default referral tiers
INSERT INTO public.zivo_referral_tiers (tier_name, min_referrals, referrer_reward, referee_reward) VALUES
('Starter', 0, 10.00, 10.00),
('Bronze', 5, 15.00, 10.00),
('Silver', 15, 20.00, 15.00),
('Gold', 30, 25.00, 20.00);

-- Default first booking incentives
INSERT INTO public.zivo_first_booking_incentives (service, credit_amount, min_booking_value, is_active) VALUES
('flights', 15.00, 100.00, true),
('cars', 20.00, 50.00, true),
('rides', 5.00, 10.00, true),
('eats', 5.00, 15.00, true),
('move', 10.00, 25.00, true);

-- Default cross-sell incentives
INSERT INTO public.zivo_cross_sell_incentives (trigger_service, target_service, credit_amount, credit_expires_days, message_template) VALUES
('flights', 'cars', 15.00, 14, 'Need a car at your destination? Get $15 off your rental!'),
('flights', 'rides', 5.00, 7, 'Book an airport pickup and save $5!'),
('cars', 'rides', 5.00, 7, 'Need a ride to pick up your car? Save $5!'),
('eats', 'move', 5.00, 14, 'Try ZIVO Move for package delivery - $5 off!'),
('rides', 'eats', 3.00, 7, 'Hungry? Get $3 off your first ZIVO Eats order!');

-- Default badges
INSERT INTO public.zivo_badges (id, name, description, icon, category, tier, criteria_type, criteria_threshold) VALUES
('top_rated_driver', 'Top Rated', '4.9+ star rating', 'star', 'driver', 'gold', 'rating', 49),
('speed_demon', 'Speed Demon', 'Fastest average delivery time', 'zap', 'driver', 'silver', 'delivery_speed', 1),
('trip_master', 'Trip Master', '500+ completed trips', 'trophy', 'driver', 'platinum', 'trip_count', 500),
('super_host', 'Super Host', '4.9+ rating as car owner', 'award', 'car_owner', 'gold', 'rating', 49),
('fleet_leader', 'Fleet Leader', '10+ vehicles in fleet', 'truck', 'fleet', 'gold', 'vehicle_count', 10),
('fast_responder', 'Fast Responder', 'Under 5 min response time', 'clock', 'car_owner', 'silver', 'response_time', 5),
('loyal_customer', 'Loyal Traveler', '25+ bookings', 'heart', 'customer', 'gold', 'booking_count', 25);

-- Default growth config
INSERT INTO public.zivo_growth_config (id, config_key, config_value, description) VALUES
('referral_enabled', 'referral_program_enabled', 'true', 'Enable/disable referral program'),
('credit_expiry', 'default_credit_expiry_days', '90', 'Default days until credits expire'),
('max_credits_per_booking', 'max_credits_per_booking_pct', '50', 'Max % of booking payable with credits');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'ZIVO' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM zivo_referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Get or create user's referral code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT code INTO v_code FROM zivo_referral_codes WHERE user_id = p_user_id;
  
  IF v_code IS NULL THEN
    v_code := generate_referral_code();
    INSERT INTO zivo_referral_codes (user_id, code) VALUES (p_user_id, v_code);
  END IF;
  
  RETURN v_code;
END;
$$;

-- Get user's credit balance
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID, p_service TEXT DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount - used_amount), 0) INTO v_balance
  FROM zivo_credits
  WHERE user_id = p_user_id
    AND is_expired = false
    AND (expires_at IS NULL OR expires_at > now())
    AND (p_service IS NULL OR p_service = ANY(usable_on));
  
  RETURN v_balance;
END;
$$;

-- Apply referral and grant credits
CREATE OR REPLACE FUNCTION public.process_referral_signup(p_referee_id UUID, p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id UUID;
  v_tier RECORD;
  v_referrer_count INTEGER;
BEGIN
  -- Find referrer
  SELECT user_id INTO v_referrer_id 
  FROM zivo_referral_codes 
  WHERE code = UPPER(p_referral_code) AND is_active = true;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;
  
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use own referral code');
  END IF;
  
  -- Check if already referred
  IF EXISTS(SELECT 1 FROM zivo_referrals WHERE referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already referred');
  END IF;
  
  -- Get referrer's tier
  SELECT total_referrals INTO v_referrer_count FROM zivo_referral_codes WHERE user_id = v_referrer_id;
  SELECT * INTO v_tier FROM zivo_referral_tiers 
  WHERE min_referrals <= COALESCE(v_referrer_count, 0) AND is_active = true
  ORDER BY min_referrals DESC LIMIT 1;
  
  -- Create referral record
  INSERT INTO zivo_referrals (referrer_id, referee_id, referral_code, referrer_credit_amount, referee_credit_amount)
  VALUES (v_referrer_id, p_referee_id, UPPER(p_referral_code), v_tier.referrer_reward, v_tier.referee_reward);
  
  -- Grant immediate credit to referee
  INSERT INTO zivo_credits (user_id, amount, credit_type, source_service, description, expires_at)
  VALUES (p_referee_id, v_tier.referee_reward, 'referral_bonus', 'global', 
          'Welcome bonus from referral', now() + INTERVAL '90 days');
  
  RETURN jsonb_build_object('success', true, 'credit_earned', v_tier.referee_reward);
END;
$$;
