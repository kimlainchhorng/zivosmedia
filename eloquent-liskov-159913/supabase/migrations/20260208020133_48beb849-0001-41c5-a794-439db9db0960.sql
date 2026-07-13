-- Add is_active column to city_pricing if it doesn't exist
ALTER TABLE city_pricing 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Seed initial city pricing data
INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, is_active) VALUES
-- Baton Rouge (home market)
('Baton Rouge', 'standard', 3.00, 1.50, 0.30, 2.00, 6.00, true),
('Baton Rouge', 'comfort', 4.50, 2.25, 0.45, 2.50, 9.00, true),
('Baton Rouge', 'xl', 5.00, 2.50, 0.50, 2.50, 10.00, true),
('Baton Rouge', 'pet', 4.00, 2.00, 0.40, 2.50, 8.00, true),
('Baton Rouge', 'black', 8.00, 4.00, 0.80, 3.00, 15.00, true),
('Baton Rouge', 'black_suv', 10.00, 5.00, 1.00, 3.50, 20.00, true),
-- New Orleans (premium market)
('New Orleans', 'standard', 3.50, 1.75, 0.35, 2.50, 7.00, true),
('New Orleans', 'comfort', 5.00, 2.50, 0.50, 3.00, 10.00, true),
('New Orleans', 'xl', 5.50, 2.75, 0.55, 3.00, 11.00, true),
('New Orleans', 'pet', 4.50, 2.25, 0.45, 3.00, 9.00, true),
('New Orleans', 'black', 9.00, 4.50, 0.90, 3.50, 18.00, true),
('New Orleans', 'black_suv', 11.00, 5.50, 1.10, 4.00, 22.00, true),
-- Default fallback (used when city not found)
('default', 'standard', 3.50, 1.75, 0.35, 2.50, 7.00, true),
('default', 'comfort', 5.00, 2.50, 0.50, 3.00, 10.00, true),
('default', 'xl', 5.50, 2.75, 0.55, 3.00, 11.00, true),
('default', 'pet', 4.50, 2.25, 0.45, 3.00, 9.00, true),
('default', 'black', 9.00, 4.50, 0.90, 3.50, 18.00, true),
('default', 'black_suv', 11.00, 5.50, 1.10, 4.00, 22.00, true)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN city_pricing.is_active IS 'Whether this pricing rule is currently active';