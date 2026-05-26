-- =============================================
-- LOYALTY POINTS AND REWARDS SYSTEM SCHEMA
-- =============================================

-- 1. Loyalty Settings Table (configurable earn rates and rules)
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access for settings
CREATE POLICY "Admins can manage loyalty settings"
  ON loyalty_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Anyone can read settings (for display purposes)
CREATE POLICY "Anyone can read loyalty settings"
  ON loyalty_settings FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO loyalty_settings (key, value, description) VALUES
  ('earn_rate', '{"points_per_dollar": 1, "enabled": true}', 'Points earned per $1 spent'),
  ('bonus_rules', '{"first_order": 500, "membership_multiplier": 1.5}', 'Bonus point rules'),
  ('tier_thresholds', '{"explorer": 0, "traveler": 5000, "elite": 25000}', 'Tier point thresholds'),
  ('redemption_enabled', 'true', 'Whether points redemption is active')
ON CONFLICT (key) DO NOTHING;

-- 2. Platform Rewards Table (platform-wide reward definitions)
CREATE TABLE IF NOT EXISTS platform_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount', 'free_delivery', 'credits', 'perk')),
  reward_value NUMERIC,
  is_active BOOLEAN DEFAULT true,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_rewards ENABLE ROW LEVEL SECURITY;

-- Anyone can read active rewards
CREATE POLICY "Anyone can read active rewards"
  ON platform_rewards FOR SELECT
  USING (is_active = true);

-- Admins can manage rewards
CREATE POLICY "Admins can manage rewards"
  ON platform_rewards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Insert default rewards
INSERT INTO platform_rewards (name, description, points_required, reward_type, reward_value, is_active) VALUES
  ('$5 Discount', 'Get $5 off your next order', 500, 'discount', 5.00, true),
  ('$10 Discount', 'Get $10 off your next order', 1000, 'discount', 10.00, true),
  ('$25 Discount', 'Best value - Get $25 off!', 2000, 'discount', 25.00, true),
  ('Free Delivery', 'Waive delivery fee on your next order', 300, 'free_delivery', 0, true),
  ('Priority Alerts', 'Get price drop alerts first (30 days)', 300, 'perk', 30, true),
  ('$5 Credits', 'Add $5 to your wallet', 500, 'credits', 5.00, true)
ON CONFLICT DO NOTHING;

-- 3. Points Ledger Table (detailed transaction history)
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'bonus', 'adjust', 'expire')),
  source TEXT,
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read their own ledger
CREATE POLICY "Users can read their own points ledger"
  ON points_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all ledgers
CREATE POLICY "Admins can read all points ledgers"
  ON points_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- System can insert (via service role)
CREATE POLICY "Service can insert points ledger"
  ON points_ledger FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created ON points_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_type ON points_ledger(transaction_type);

-- 4. Reward Redemptions Table (track when users redeem rewards)
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES platform_rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
  applied_to_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own redemptions
CREATE POLICY "Users can read their own redemptions"
  ON reward_redemptions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own redemptions
CREATE POLICY "Users can create their own redemptions"
  ON reward_redemptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all redemptions
CREATE POLICY "Admins can manage redemptions"
  ON reward_redemptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);

-- 5. Add points_awarded_at column to food_orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_orders' AND column_name = 'points_awarded_at'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN points_awarded_at TIMESTAMPTZ;
  END IF;
END $$;

-- 6. Function to calculate tier from lifetime points
CREATE OR REPLACE FUNCTION get_tier_from_points(lifetime_pts INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF lifetime_pts >= 25000 THEN
    RETURN 'elite';
  ELSIF lifetime_pts >= 5000 THEN
    RETURN 'traveler';
  ELSE
    RETURN 'explorer';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Function to award points for an order
CREATE OR REPLACE FUNCTION award_order_points(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_user_id UUID;
  v_current_balance INTEGER;
  v_lifetime_points INTEGER;
  v_points_per_dollar INTEGER;
  v_first_order_bonus INTEGER;
  v_membership_multiplier NUMERIC;
  v_is_first_order BOOLEAN;
  v_has_membership BOOLEAN;
  v_base_points INTEGER;
  v_total_points INTEGER;
  v_new_balance INTEGER;
  v_new_lifetime INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Check if points already awarded
  IF v_order.points_awarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Points already awarded');
  END IF;
  
  -- Check if order is completed/delivered
  IF v_order.status NOT IN ('completed', 'delivered') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not completed');
  END IF;
  
  v_user_id := v_order.customer_id;
  
  -- Get loyalty settings
  SELECT COALESCE((value->>'points_per_dollar')::INTEGER, 1) INTO v_points_per_dollar
  FROM loyalty_settings WHERE key = 'earn_rate';
  
  SELECT 
    COALESCE((value->>'first_order')::INTEGER, 500),
    COALESCE((value->>'membership_multiplier')::NUMERIC, 1.5)
  INTO v_first_order_bonus, v_membership_multiplier
  FROM loyalty_settings WHERE key = 'bonus_rules';
  
  -- Get current points balance
  SELECT COALESCE(points_balance, 0), COALESCE(lifetime_points, 0)
  INTO v_current_balance, v_lifetime_points
  FROM loyalty_points WHERE user_id = v_user_id;
  
  -- Initialize if not exists
  IF v_current_balance IS NULL THEN
    INSERT INTO loyalty_points (user_id, points_balance, lifetime_points, tier)
    VALUES (v_user_id, 0, 0, 'standard')
    ON CONFLICT (user_id) DO NOTHING;
    v_current_balance := 0;
    v_lifetime_points := 0;
  END IF;
  
  -- Calculate base points
  v_base_points := FLOOR(COALESCE(v_order.total_amount, 0) * v_points_per_dollar);
  v_total_points := v_base_points;
  
  -- Check if first order
  SELECT COUNT(*) = 0 INTO v_is_first_order
  FROM food_orders 
  WHERE customer_id = v_user_id 
  AND id != p_order_id 
  AND status IN ('completed', 'delivered')
  AND points_awarded_at IS NOT NULL;
  
  IF v_is_first_order THEN
    v_total_points := v_total_points + v_first_order_bonus;
  END IF;
  
  -- Check membership status
  SELECT EXISTS (
    SELECT 1 FROM user_memberships 
    WHERE user_id = v_user_id 
    AND status = 'active'
  ) INTO v_has_membership;
  
  IF v_has_membership THEN
    v_total_points := FLOOR(v_total_points * v_membership_multiplier);
  END IF;
  
  -- Calculate new balances
  v_new_balance := v_current_balance + v_total_points;
  v_new_lifetime := v_lifetime_points + v_total_points;
  v_new_tier := get_tier_from_points(v_new_lifetime);
  
  -- Update loyalty_points
  UPDATE loyalty_points
  SET 
    points_balance = v_new_balance,
    lifetime_points = v_new_lifetime,
    tier = v_new_tier,
    tier_updated_at = CASE WHEN tier != v_new_tier THEN now() ELSE tier_updated_at END,
    updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Insert ledger entry
  INSERT INTO points_ledger (
    user_id, points_amount, balance_after, transaction_type, source, reference_id, description, metadata
  ) VALUES (
    v_user_id,
    v_total_points,
    v_new_balance,
    CASE WHEN v_is_first_order THEN 'bonus' ELSE 'earn' END,
    'order',
    p_order_id,
    CASE WHEN v_is_first_order 
      THEN 'First order bonus + Order #' || LEFT(p_order_id::TEXT, 8)
      ELSE 'Order #' || LEFT(p_order_id::TEXT, 8)
    END,
    jsonb_build_object(
      'order_total', v_order.total_amount,
      'base_points', v_base_points,
      'first_order_bonus', CASE WHEN v_is_first_order THEN v_first_order_bonus ELSE 0 END,
      'membership_multiplier', CASE WHEN v_has_membership THEN v_membership_multiplier ELSE 1 END
    )
  );
  
  -- Mark order as points awarded
  UPDATE food_orders SET points_awarded_at = now() WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_total_points,
    'new_balance', v_new_balance,
    'new_tier', v_new_tier,
    'is_first_order', v_is_first_order,
    'has_membership', v_has_membership
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Trigger to auto-award points on order completion
CREATE OR REPLACE FUNCTION trigger_award_points_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to completed/delivered
  IF NEW.status IN ('completed', 'delivered') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'delivered'))
     AND NEW.points_awarded_at IS NULL THEN
    -- Award points directly via function
    PERFORM award_order_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_order_delivered_award_points ON food_orders;
CREATE TRIGGER on_order_delivered_award_points
AFTER UPDATE ON food_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_award_points_on_delivery();