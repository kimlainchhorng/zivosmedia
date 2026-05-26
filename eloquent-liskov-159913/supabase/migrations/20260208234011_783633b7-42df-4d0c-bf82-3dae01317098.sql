-- Extend restaurant_ads table with additional fields
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'search';
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS total_budget NUMERIC(10,2);
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS spent NUMERIC(10,2) DEFAULT 0;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS orders_from_ads INTEGER DEFAULT 0;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE restaurant_ads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_ads_status ON restaurant_ads(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_restaurant_ads_restaurant ON restaurant_ads(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_ads_placement ON restaurant_ads(placement) WHERE status = 'active';

-- Create ad_conversions table to track orders from ads
CREATE TABLE IF NOT EXISTS ad_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES restaurant_ads(id) ON DELETE CASCADE,
  click_id UUID NOT NULL REFERENCES ad_clicks(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  revenue_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_conversions_ad ON ad_conversions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_order ON ad_conversions(order_id);

-- Create ad_billing_events table for billing audit trail
CREATE TABLE IF NOT EXISTS ad_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES restaurant_ads(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  click_id UUID REFERENCES ad_clicks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_billing_events_ad ON ad_billing_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_billing_events_restaurant ON ad_billing_events(restaurant_id);

-- RLS for ad_conversions
ALTER TABLE ad_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversions" ON ad_conversions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurant_ads ra
      JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE ra.id = ad_conversions.ad_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all conversions" ON ad_conversions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS for ad_billing_events
ALTER TABLE ad_billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own billing events" ON ad_billing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = ad_billing_events.restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all billing events" ON ad_billing_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RPC function to deduct merchant balance atomically
CREATE OR REPLACE FUNCTION deduct_merchant_balance(
  p_restaurant_id UUID,
  p_amount_cents INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT pending INTO current_balance
  FROM merchant_balances
  WHERE restaurant_id = p_restaurant_id
  FOR UPDATE;
  
  IF current_balance IS NULL THEN
    -- Create balance record if doesn't exist
    INSERT INTO merchant_balances (restaurant_id, pending, paid_out, currency)
    VALUES (p_restaurant_id, 0, 0, 'USD');
    RETURN FALSE;
  END IF;
  
  IF current_balance >= (p_amount_cents / 100.0) THEN
    UPDATE merchant_balances
    SET pending = pending - (p_amount_cents / 100.0),
        updated_at = now()
    WHERE restaurant_id = p_restaurant_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to get today's ad spend
CREATE OR REPLACE FUNCTION get_today_ad_spend(p_ad_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  today_spent NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_cents) / 100.0, 0) INTO today_spent
  FROM ad_billing_events
  WHERE ad_id = p_ad_id
    AND event_type = 'click_charge'
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
  
  RETURN today_spent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;