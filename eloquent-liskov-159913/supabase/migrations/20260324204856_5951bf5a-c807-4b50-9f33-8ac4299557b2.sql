-- Sync all Cambodia cities to match Phnom Penh pricing exactly
-- Step 1: Delete old "comfort" rows from non-PP Cambodia cities (PP uses "standard" now)
DELETE FROM city_pricing 
WHERE ride_type = 'comfort' 
AND city IN ('Siem Reap','Battambang','Sihanoukville','Kampong Cham','Poipet','Kampot','Takeo','Svay Rieng','Prey Veng','Pursat','Kratie','Koh Kong','Stung Treng','Ratanakiri','Mondulkiri','Pailin','Kep','Banteay Meanchey','Kandal','Kampong Chhnang','Kampong Speu','Kampong Thom','Preah Vihear','Oddar Meanchey','Tboung Khmum');

-- Step 2: Update existing rows (tuktuk, tuktuk_ev, xl) to match current Phnom Penh values
UPDATE city_pricing SET base_fare = 0, per_mile = 1500, per_minute = 50, booking_fee = 0, minimum_fare = 3500, card_fee_pct = 3.5, is_active = true, updated_at = now()
WHERE ride_type = 'tuktuk' AND city IN ('Siem Reap','Battambang','Sihanoukville','Kampong Cham','Poipet','Kampot','Takeo','Svay Rieng','Prey Veng','Pursat','Kratie','Koh Kong','Stung Treng','Ratanakiri','Mondulkiri','Pailin','Kep','Banteay Meanchey','Kandal','Kampong Chhnang','Kampong Speu','Kampong Thom','Preah Vihear','Oddar Meanchey','Tboung Khmum');

UPDATE city_pricing SET base_fare = 0, per_mile = 1450, per_minute = 50, booking_fee = 0, minimum_fare = 3500, card_fee_pct = 3.5, is_active = true, updated_at = now()
WHERE ride_type = 'tuktuk_ev' AND city IN ('Siem Reap','Battambang','Sihanoukville','Kampong Cham','Poipet','Kampot','Takeo','Svay Rieng','Prey Veng','Pursat','Kratie','Koh Kong','Stung Treng','Ratanakiri','Mondulkiri','Pailin','Kep','Banteay Meanchey','Kandal','Kampong Chhnang','Kampong Speu','Kampong Thom','Preah Vihear','Oddar Meanchey','Tboung Khmum');

UPDATE city_pricing SET base_fare = 0, per_mile = 3000, per_minute = 50, booking_fee = 0, minimum_fare = 8000, card_fee_pct = 3.5, is_active = true, updated_at = now()
WHERE ride_type = 'xl' AND city IN ('Siem Reap','Battambang','Sihanoukville','Kampong Cham','Poipet','Kampot','Takeo','Svay Rieng','Prey Veng','Pursat','Kratie','Koh Kong','Stung Treng','Ratanakiri','Mondulkiri','Pailin','Kep','Banteay Meanchey','Kandal','Kampong Chhnang','Kampong Speu','Kampong Thom','Preah Vihear','Oddar Meanchey','Tboung Khmum');

-- Step 3: Insert new "standard" and "ev" ride types for all Cambodia cities
INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, card_fee_pct, is_active, updated_at)
SELECT c.city, 'standard', 0, 3000, 100, 0, 8000, 3.5, true, now()
FROM (VALUES ('Siem Reap'),('Battambang'),('Sihanoukville'),('Kampong Cham'),('Poipet'),('Kampot'),('Takeo'),('Svay Rieng'),('Prey Veng'),('Pursat'),('Kratie'),('Koh Kong'),('Stung Treng'),('Ratanakiri'),('Mondulkiri'),('Pailin'),('Kep'),('Banteay Meanchey'),('Kandal'),('Kampong Chhnang'),('Kampong Speu'),('Kampong Thom'),('Preah Vihear'),('Oddar Meanchey'),('Tboung Khmum')) AS c(city)
ON CONFLICT DO NOTHING;

INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, card_fee_pct, is_active, updated_at)
SELECT c.city, 'ev', 0, 2500, 100, 0, 8000, 3.5, true, now()
FROM (VALUES ('Siem Reap'),('Battambang'),('Sihanoukville'),('Kampong Cham'),('Poipet'),('Kampot'),('Takeo'),('Svay Rieng'),('Prey Veng'),('Pursat'),('Kratie'),('Koh Kong'),('Stung Treng'),('Ratanakiri'),('Mondulkiri'),('Pailin'),('Kep'),('Banteay Meanchey'),('Kandal'),('Kampong Chhnang'),('Kampong Speu'),('Kampong Thom'),('Preah Vihear'),('Oddar Meanchey'),('Tboung Khmum')) AS c(city)
ON CONFLICT DO NOTHING;