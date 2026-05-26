-- Create promo_codes table
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active promo codes (for validation)
CREATE POLICY "Allow read access to promo codes" ON promo_codes
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

-- Create RPC function for atomic increment
CREATE OR REPLACE FUNCTION increment_promo_uses(promo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes 
  SET uses = uses + 1 
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample promo codes
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at) VALUES
  ('FIRST25', 'percent', 25, 1000, '2026-12-31'),
  ('RIDE10', 'percent', 10, null, null),
  ('SAVE5', 'fixed', 5, 500, '2026-06-30');