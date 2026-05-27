-- Add missing ride types to city_pricing
INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, is_active) VALUES
-- Share
('default', 'share', 2.00, 1.00, 0.20, 1.50, 4.00, true),
('New Orleans', 'share', 2.00, 1.00, 0.20, 1.50, 4.00, true),
('Baton Rouge', 'share', 1.75, 0.90, 0.18, 1.25, 3.50, true),
-- EV
('default', 'ev', 4.00, 2.00, 0.40, 2.50, 8.00, true),
('New Orleans', 'ev', 4.00, 2.00, 0.40, 2.50, 8.00, true),
('Baton Rouge', 'ev', 3.50, 1.75, 0.35, 2.00, 7.00, true),
-- Wheelchair
('default', 'wheelchair', 4.00, 1.80, 0.35, 2.50, 8.00, true),
('New Orleans', 'wheelchair', 4.00, 1.80, 0.35, 2.50, 8.00, true),
('Baton Rouge', 'wheelchair', 3.50, 1.60, 0.30, 2.00, 7.00, true),
-- Luxury XL
('default', 'luxury_xl', 10.50, 5.50, 1.10, 4.50, 25.00, true),
('New Orleans', 'luxury_xl', 10.50, 5.50, 1.10, 4.50, 25.00, true),
('Baton Rouge', 'luxury_xl', 9.50, 5.00, 1.00, 4.00, 22.00, true);