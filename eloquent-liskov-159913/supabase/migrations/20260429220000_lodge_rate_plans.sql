-- Add breakfast_rate_cents (price when breakfast is bundled in)
-- and original_rate_cents (rack rate before Getaway Deal discount)
ALTER TABLE public.lodge_rooms
  ADD COLUMN IF NOT EXISTS breakfast_rate_cents integer,
  ADD COLUMN IF NOT EXISTS original_rate_cents   integer;

-- Seed Koh Sdach Resort meal plans
DO $$
DECLARE
  sid uuid := '7322b460-2c23-4d3d-bdc5-55a31cc65fab';
BEGIN
  DELETE FROM lodging_meal_plans WHERE store_id = sid;
  INSERT INTO lodging_meal_plans (store_id, code, name, description, price_per_guest_cents, active, sort_order)
  VALUES
    (sid, 'RO',  'Room Only',              'No meals included. Pay for food separately.',    0,    true, 0),
    (sid, 'BBO', 'Breakfast Add-on',       'Exceptional breakfast at the resort restaurant. +$12 per person.', 1200, true, 1),
    (sid, 'BBI', 'Breakfast Included',     'All-inclusive breakfast rate. Includes 15% off food & drinks.',  0, true, 2);
END $$;

-- Patch room rates to match live Booking.com data
DO $$
DECLARE
  sid uuid := '7322b460-2c23-4d3d-bdc5-55a31cc65fab';
BEGIN
  -- Deluxe Double Garden View: Room Only $71, Breakfast Included $104, no Getaway Deal
  UPDATE lodge_rooms SET
    breakfast_rate_cents = 10400,
    original_rate_cents  = NULL,
    badges = ARRAY[]::text[]
  WHERE store_id = sid AND name = 'Deluxe Double Garden View';

  -- Deluxe Double Sea View: Room Only $85, Breakfast Included $121, Getaway Deal $107 (was $134)
  UPDATE lodge_rooms SET
    breakfast_rate_cents = 12100,
    original_rate_cents  = 13400,
    badges = ARRAY['Getaway Deal']
  WHERE store_id = sid AND name = 'Deluxe Double Sea View';

  -- Family Room Garden View: $122, Breakfast Included $137, no Getaway Deal
  UPDATE lodge_rooms SET
    breakfast_rate_cents = 13700,
    original_rate_cents  = NULL,
    badges = ARRAY[]::text[]
  WHERE store_id = sid AND name = 'Family Room Garden View';

  -- Family Suite Sea View: $151, Breakfast Included $166, no Getaway Deal
  UPDATE lodge_rooms SET
    breakfast_rate_cents = 16600,
    original_rate_cents  = NULL,
    badges = ARRAY[]::text[]
  WHERE store_id = sid AND name = 'Family Suite Sea View';

  -- Junior Family Suite Sea View: $178 (was $223, 20% off), Breakfast Included $193 (was $241)
  UPDATE lodge_rooms SET
    breakfast_rate_cents = 19300,
    original_rate_cents  = 22300,
    badges = ARRAY['Getaway Deal']
  WHERE store_id = sid AND name = 'Junior Family Suite Sea View';

  -- Family Suite Private Pool Sea View: $193, Breakfast Included $207 (was $259, 20% off)
  UPDATE lodge_rooms SET
    breakfast_rate_cents = 20700,
    original_rate_cents  = 25900,
    badges = ARRAY['Getaway Deal']
  WHERE store_id = sid AND name = 'Family Suite Private Pool Sea View';
END $$;
