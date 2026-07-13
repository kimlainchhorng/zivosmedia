-- Update zone pricing rates to industry-standard values for default zone
-- This fixes the high pricing issue by reducing base rates

-- Standard: base $2.50, $1.25/mi, $0.25/min, booking $1.50
UPDATE zone_pricing_rates 
SET base_fare = 2.50, per_mile = 1.25, per_minute = 0.25, booking_fee = 1.50, minimum_fare = 6.50, multiplier = 1.00
WHERE ride_type = 'standard' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Wait & Save: base $2.00, $1.00/mi, $0.20/min, booking $1.00
UPDATE zone_pricing_rates 
SET base_fare = 2.00, per_mile = 1.00, per_minute = 0.20, booking_fee = 1.00, minimum_fare = 5.50, multiplier = 0.92
WHERE ride_type = 'wait_save' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Green: base $2.50, $1.20/mi, $0.22/min, booking $1.50
UPDATE zone_pricing_rates 
SET base_fare = 2.50, per_mile = 1.20, per_minute = 0.22, booking_fee = 1.50, minimum_fare = 6.50, multiplier = 1.02
WHERE ride_type = 'green' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Priority: base $2.50, $1.20/mi, $0.22/min, booking $1.50
UPDATE zone_pricing_rates 
SET base_fare = 2.50, per_mile = 1.20, per_minute = 0.22, booking_fee = 1.50, minimum_fare = 6.50, multiplier = 1.12
WHERE ride_type = 'priority' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Pet: base $2.50, $1.20/mi, $0.22/min, booking $1.50
UPDATE zone_pricing_rates 
SET base_fare = 2.50, per_mile = 1.20, per_minute = 0.22, booking_fee = 1.50, minimum_fare = 6.50, multiplier = 1.15
WHERE ride_type = 'pet' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Comfort: base $3.00, $1.50/mi, $0.28/min, booking $1.75
UPDATE zone_pricing_rates 
SET base_fare = 3.00, per_mile = 1.50, per_minute = 0.28, booking_fee = 1.75, minimum_fare = 8.00, multiplier = 1.45
WHERE ride_type = 'comfort' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- XL: base $3.00, $1.50/mi, $0.28/min, booking $1.75
UPDATE zone_pricing_rates 
SET base_fare = 3.00, per_mile = 1.50, per_minute = 0.28, booking_fee = 1.75, minimum_fare = 8.00, multiplier = 1.45
WHERE ride_type = 'xl' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Black: base $4.00, $2.00/mi, $0.35/min, booking $2.00
UPDATE zone_pricing_rates 
SET base_fare = 4.00, per_mile = 2.00, per_minute = 0.35, booking_fee = 2.00, minimum_fare = 12.00, multiplier = 1.65
WHERE ride_type = 'black' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Black SUV: base $5.00, $2.50/mi, $0.42/min, booking $2.25
UPDATE zone_pricing_rates 
SET base_fare = 5.00, per_mile = 2.50, per_minute = 0.42, booking_fee = 2.25, minimum_fare = 15.00, multiplier = 2.10
WHERE ride_type = 'black_suv' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- XXL: base $3.50, $1.75/mi, $0.30/min, booking $2.00
UPDATE zone_pricing_rates 
SET base_fare = 3.50, per_mile = 1.75, per_minute = 0.30, booking_fee = 2.00, minimum_fare = 9.00, multiplier = 1.75
WHERE ride_type = 'xxl' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Premium: base $4.00, $2.00/mi, $0.35/min, booking $2.00
UPDATE zone_pricing_rates 
SET base_fare = 4.00, per_mile = 2.00, per_minute = 0.35, booking_fee = 2.00, minimum_fare = 12.00, multiplier = 1.65
WHERE ride_type = 'premium' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Elite: base $6.00, $2.80/mi, $0.48/min, booking $2.50
UPDATE zone_pricing_rates 
SET base_fare = 6.00, per_mile = 2.80, per_minute = 0.48, booking_fee = 2.50, minimum_fare = 20.00, multiplier = 2.10
WHERE ride_type = 'elite' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Lux: base $12.00, $5.00/mi, $0.85/min, booking $4.00
UPDATE zone_pricing_rates 
SET base_fare = 12.00, per_mile = 5.00, per_minute = 0.85, booking_fee = 4.00, minimum_fare = 60.00, multiplier = 3.50
WHERE ride_type = 'lux' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Sprinter: base $10.00, $4.00/mi, $0.70/min, booking $4.00
UPDATE zone_pricing_rates 
SET base_fare = 10.00, per_mile = 4.00, per_minute = 0.70, booking_fee = 4.00, minimum_fare = 40.00, multiplier = 2.50
WHERE ride_type = 'sprinter' AND zone_id = '00000000-0000-0000-0000-000000000001';

-- Secure: base $20.00, $7.00/mi, $1.10/min, booking $8.00
UPDATE zone_pricing_rates 
SET base_fare = 20.00, per_mile = 7.00, per_minute = 1.10, booking_fee = 8.00, minimum_fare = 80.00, multiplier = 4.00
WHERE ride_type = 'secure' AND zone_id = '00000000-0000-0000-0000-000000000001';