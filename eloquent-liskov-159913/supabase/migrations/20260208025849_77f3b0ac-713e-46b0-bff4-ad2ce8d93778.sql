-- Seed Default US Zone for fallback pricing
INSERT INTO pricing_zones (id, name, state, country, min_lat, max_lat, min_lng, max_lng, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default US', NULL, 'US', 24.0, 50.0, -125.0, -66.0, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Baton Rouge Zone
INSERT INTO pricing_zones (id, name, state, country, min_lat, max_lat, min_lng, max_lng, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Baton Rouge', 'LA', 'US', 30.35, 30.55, -91.30, -91.05, true)
ON CONFLICT (id) DO NOTHING;

-- Seed New Orleans Zone
INSERT INTO pricing_zones (id, name, state, country, min_lat, max_lat, min_lng, max_lng, is_active)
VALUES ('00000000-0000-0000-0000-000000000003', 'New Orleans', 'LA', 'US', 29.85, 30.10, -90.15, -89.85, true)
ON CONFLICT (id) DO NOTHING;

-- Seed default rates for Default US zone (standard ride type)
INSERT INTO zone_pricing_rates (id, zone_id, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, multiplier)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'standard', 3.50, 1.75, 0.35, 2.50, 7.00, 1.0)
ON CONFLICT DO NOTHING;

-- Seed Baton Rouge rates (standard)
INSERT INTO zone_pricing_rates (id, zone_id, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, multiplier)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'standard', 3.00, 1.50, 0.30, 2.50, 6.50, 1.0)
ON CONFLICT DO NOTHING;

-- Seed New Orleans rates (standard) - slightly higher
INSERT INTO zone_pricing_rates (id, zone_id, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, multiplier)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'standard', 4.00, 2.00, 0.40, 2.75, 8.00, 1.0)
ON CONFLICT DO NOTHING;