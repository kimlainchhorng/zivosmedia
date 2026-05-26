
-- Bulk insert Cambodia pricing for all 4 cities × 10 ride types
-- Prices are in KHR (Cambodian Riel). Based on hardcoded rates:
-- economy tuktuk: per_km=1550 KHR, per_min=50 KHR
-- EV tuktuk: per_km=1250 KHR

-- Delete existing Cambodia tuktuk entry to avoid duplicates
DELETE FROM city_pricing WHERE city IN ('Phnom Penh', 'Battambang', 'Siem Reap', 'Sihanoukville');

INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, is_active) VALUES
-- Phnom Penh
('Phnom Penh', 'standard',   0.75,  0.45,  0.08,  0.50,  1.50,  true),
('Phnom Penh', 'share',      0.50,  0.30,  0.05,  0.25,  1.00,  true),
('Phnom Penh', 'comfort',    1.00,  0.60,  0.10,  0.75,  2.50,  true),
('Phnom Penh', 'ev',         0.75,  0.45,  0.08,  0.50,  1.50,  true),
('Phnom Penh', 'xl',         1.25,  0.75,  0.12,  0.75,  3.00,  true),
('Phnom Penh', 'pet',        1.00,  0.50,  0.10,  0.75,  2.00,  true),
('Phnom Penh', 'tuktuk',     0.00,  0.38,  0.012, 0.13,  0.25,  true),
('Phnom Penh', 'tuktuk_ev',  0.00,  0.31,  0.012, 0.13,  0.25,  true),
('Phnom Penh', 'moto',       0.00,  0.25,  0.008, 0.10,  0.25,  true),
('Phnom Penh', 'share_xl',   0.75,  0.40,  0.06,  0.35,  1.25,  true),

-- Battambang (slightly lower than Phnom Penh)
('Battambang', 'standard',   0.60,  0.40,  0.06,  0.40,  1.25,  true),
('Battambang', 'share',      0.40,  0.25,  0.04,  0.20,  0.75,  true),
('Battambang', 'comfort',    0.85,  0.50,  0.08,  0.60,  2.00,  true),
('Battambang', 'ev',         0.60,  0.40,  0.06,  0.40,  1.25,  true),
('Battambang', 'xl',         1.00,  0.60,  0.10,  0.60,  2.50,  true),
('Battambang', 'pet',        0.85,  0.45,  0.08,  0.60,  1.75,  true),
('Battambang', 'tuktuk',     0.00,  0.35,  0.010, 0.10,  0.25,  true),
('Battambang', 'tuktuk_ev',  0.00,  0.28,  0.010, 0.10,  0.25,  true),
('Battambang', 'moto',       0.00,  0.22,  0.006, 0.08,  0.25,  true),
('Battambang', 'share_xl',   0.60,  0.35,  0.05,  0.30,  1.00,  true),

-- Siem Reap (tourist area, slightly higher)
('Siem Reap', 'standard',   0.75,  0.45,  0.08,  0.50,  1.50,  true),
('Siem Reap', 'share',      0.50,  0.30,  0.05,  0.25,  1.00,  true),
('Siem Reap', 'comfort',    1.00,  0.60,  0.10,  0.75,  2.50,  true),
('Siem Reap', 'ev',         0.75,  0.45,  0.08,  0.50,  1.50,  true),
('Siem Reap', 'xl',         1.25,  0.75,  0.12,  0.75,  3.00,  true),
('Siem Reap', 'pet',        1.00,  0.50,  0.10,  0.75,  2.00,  true),
('Siem Reap', 'tuktuk',     0.00,  0.38,  0.012, 0.13,  0.25,  true),
('Siem Reap', 'tuktuk_ev',  0.00,  0.31,  0.012, 0.13,  0.25,  true),
('Siem Reap', 'moto',       0.00,  0.25,  0.008, 0.10,  0.25,  true),
('Siem Reap', 'share_xl',   0.75,  0.40,  0.06,  0.35,  1.25,  true),

-- Sihanoukville
('Sihanoukville', 'standard',   0.70,  0.42,  0.07,  0.45,  1.40,  true),
('Sihanoukville', 'share',      0.45,  0.28,  0.04,  0.22,  0.90,  true),
('Sihanoukville', 'comfort',    0.95,  0.55,  0.09,  0.70,  2.25,  true),
('Sihanoukville', 'ev',         0.70,  0.42,  0.07,  0.45,  1.40,  true),
('Sihanoukville', 'xl',         1.15,  0.70,  0.11,  0.70,  2.75,  true),
('Sihanoukville', 'pet',        0.95,  0.48,  0.09,  0.70,  1.85,  true),
('Sihanoukville', 'tuktuk',     0.00,  0.36,  0.011, 0.12,  0.25,  true),
('Sihanoukville', 'tuktuk_ev',  0.00,  0.30,  0.011, 0.12,  0.25,  true),
('Sihanoukville', 'moto',       0.00,  0.23,  0.007, 0.09,  0.25,  true),
('Sihanoukville', 'share_xl',   0.65,  0.38,  0.05,  0.32,  1.10,  true);
