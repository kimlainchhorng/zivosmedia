-- Create category pricing table
CREATE TABLE public.p2p_category_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  min_daily_price NUMERIC(10,2) NOT NULL,
  suggested_daily_price NUMERIC(10,2) NOT NULL,
  max_daily_price NUMERIC(10,2) NOT NULL,
  city TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_price_range CHECK (min_daily_price <= suggested_daily_price AND suggested_daily_price <= max_daily_price),
  CONSTRAINT positive_prices CHECK (min_daily_price > 0)
);

-- Create unique index for category + city combination
CREATE UNIQUE INDEX idx_category_pricing_unique ON p2p_category_pricing (category, COALESCE(city, '__default__'));

-- Create index for lookups
CREATE INDEX idx_category_pricing_category ON p2p_category_pricing(category);

-- Seed default pricing data
INSERT INTO p2p_category_pricing (category, min_daily_price, suggested_daily_price, max_daily_price)
VALUES
  ('economy', 40, 55, 70),
  ('compact', 40, 55, 70),
  ('midsize', 55, 75, 90),
  ('fullsize', 55, 75, 90),
  ('suv', 70, 95, 120),
  ('truck', 90, 125, 160),
  ('minivan', 70, 95, 120),
  ('luxury', 110, 150, 200);

-- Add system setting for toggling price suggestions
INSERT INTO system_settings (key, value, description, category, is_public)
VALUES ('p2p_price_suggestions_enabled', 'true', 'Show price suggestions to owners', 'p2p', false)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE p2p_category_pricing ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read active pricing
CREATE POLICY "Anyone can read active category pricing"
  ON p2p_category_pricing FOR SELECT
  USING (is_active = true);

-- RLS: Admin full access
CREATE POLICY "Admin full access to category pricing"
  ON p2p_category_pricing FOR ALL
  USING (public.is_admin(auth.uid()));