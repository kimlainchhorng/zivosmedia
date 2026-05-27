-- Add surge tracking to food_orders
ALTER TABLE food_orders 
ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS surge_fee_cents INTEGER DEFAULT 0;