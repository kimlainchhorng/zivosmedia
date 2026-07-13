-- =====================================================
-- Promotions Enhancement - Complete Setup
-- =====================================================

-- Add missing columns to driver_referrals (existing table has different structure)
ALTER TABLE driver_referrals 
  ADD COLUMN IF NOT EXISTS referrer_driver_id UUID REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS required_orders INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS completed_orders INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_driver_referrals_referrer_driver ON driver_referrals(referrer_driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_referrals_status ON driver_referrals(status);

-- Add tenant_id and merchant_id to promotions
ALTER TABLE promotions 
  ADD COLUMN IF NOT EXISTS merchant_id UUID,
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_promotions_merchant ON promotions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_id);

-- RLS for driver_referrals
ALTER TABLE driver_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage driver referrals" ON driver_referrals;
CREATE POLICY "Admins can manage driver referrals" ON driver_referrals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Drivers can view own referrals" ON driver_referrals;
CREATE POLICY "Drivers can view own referrals" ON driver_referrals
  FOR SELECT TO authenticated
  USING (
    referrer_id IN (SELECT user_id FROM drivers WHERE user_id = auth.uid())
    OR referrer_driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    OR referred_driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- RLS for promotion_usage
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage promotion usage" ON promotion_usage;
CREATE POLICY "Admins can manage promotion usage" ON promotion_usage
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own usage" ON promotion_usage;
CREATE POLICY "Users can view own usage" ON promotion_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert usage" ON promotion_usage;
CREATE POLICY "System can insert usage" ON promotion_usage
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS for promotions
DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
CREATE POLICY "Admins can manage promotions" ON promotions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Merchants can manage own promotions" ON promotions;
CREATE POLICY "Merchants can manage own promotions" ON promotions
  FOR ALL TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Active promotions readable" ON promotions;
CREATE POLICY "Active promotions readable" ON promotions
  FOR SELECT TO authenticated
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));