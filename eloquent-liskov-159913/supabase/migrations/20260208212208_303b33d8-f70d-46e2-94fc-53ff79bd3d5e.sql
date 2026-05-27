-- Add Eats-specific discount columns to subscription plans
ALTER TABLE zivo_subscription_plans ADD COLUMN IF NOT EXISTS delivery_fee_discount_pct NUMERIC DEFAULT 100;
ALTER TABLE zivo_subscription_plans ADD COLUMN IF NOT EXISTS service_fee_discount_pct NUMERIC DEFAULT 50;
ALTER TABLE zivo_subscription_plans ADD COLUMN IF NOT EXISTS free_delivery_min_order NUMERIC DEFAULT 15;
ALTER TABLE zivo_subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT;
ALTER TABLE zivo_subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Add membership tracking columns to food_orders
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS membership_discount_cents INTEGER DEFAULT 0;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS membership_applied BOOLEAN DEFAULT false;

-- Create membership_usage table to track benefit usage per order
CREATE TABLE IF NOT EXISTS membership_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES food_orders(id) ON DELETE SET NULL,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('free_delivery', 'reduced_delivery_fee', 'reduced_service_fee', 'priority_driver')),
  saved_amount_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on membership_usage
ALTER TABLE membership_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own membership usage"
  ON membership_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage (via app)
CREATE POLICY "Users can insert own membership usage"
  ON membership_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_membership_usage_user_id ON membership_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_usage_order_id ON membership_usage(order_id);

-- Update existing ZIVO+ plan with discount settings (if exists)
UPDATE zivo_subscription_plans
SET 
  delivery_fee_discount_pct = 100,
  service_fee_discount_pct = 50,
  free_delivery_min_order = 15
WHERE slug = 'zivo-plus' OR name ILIKE '%plus%';