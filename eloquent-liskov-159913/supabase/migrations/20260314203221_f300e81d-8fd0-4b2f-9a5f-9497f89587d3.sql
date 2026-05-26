-- Cambodia city pricing (USD-equivalent rates, affordable local market)
-- Phnom Penh
INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, is_active) VALUES
('Phnom Penh', 'standard', 0.75, 0.45, 0.08, 0.50, 1.50, true),
('Phnom Penh', 'share', 0.50, 0.30, 0.05, 0.25, 1.00, true),
('Phnom Penh', 'comfort', 1.25, 0.65, 0.12, 0.75, 2.50, true),
('Phnom Penh', 'xl', 1.50, 0.80, 0.15, 1.00, 3.00, true),
('Phnom Penh', 'black', 2.50, 1.20, 0.20, 1.50, 5.00, true),
('Phnom Penh', 'ev', 1.00, 0.55, 0.10, 0.50, 2.00, true),
('Phnom Penh', 'pet', 1.00, 0.50, 0.10, 0.75, 2.00, true),
-- Siem Reap
('Siem Reap', 'standard', 0.60, 0.40, 0.07, 0.50, 1.25, true),
('Siem Reap', 'share', 0.40, 0.25, 0.04, 0.25, 0.75, true),
('Siem Reap', 'comfort', 1.00, 0.55, 0.10, 0.75, 2.00, true),
('Siem Reap', 'xl', 1.25, 0.70, 0.12, 1.00, 2.50, true),
('Siem Reap', 'black', 2.00, 1.00, 0.18, 1.25, 4.00, true),
('Siem Reap', 'ev', 0.85, 0.50, 0.09, 0.50, 1.75, true),
-- Sihanoukville
('Sihanoukville', 'standard', 0.65, 0.42, 0.07, 0.50, 1.25, true),
('Sihanoukville', 'share', 0.45, 0.28, 0.05, 0.25, 0.85, true),
('Sihanoukville', 'comfort', 1.10, 0.60, 0.11, 0.75, 2.25, true),
('Sihanoukville', 'xl', 1.35, 0.75, 0.13, 1.00, 2.75, true),
-- Battambang
('Battambang', 'standard', 0.50, 0.35, 0.06, 0.40, 1.00, true),
('Battambang', 'share', 0.35, 0.22, 0.04, 0.20, 0.70, true),
('Battambang', 'comfort', 0.85, 0.50, 0.09, 0.60, 1.75, true);