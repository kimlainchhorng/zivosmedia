-- Multi-City Support: Add city columns to profiles and food_orders

-- 1. Add selected city to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS selected_city_id UUID REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS selected_city_name TEXT;

-- 2. Add city tracking to food_orders
ALTER TABLE food_orders 
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
ADD COLUMN IF NOT EXISTS city_name TEXT;

-- 3. Add unique constraint on cities.name if not exists (for ON CONFLICT)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cities_name_unique'
  ) THEN
    ALTER TABLE cities ADD CONSTRAINT cities_name_unique UNIQUE (name);
  END IF;
END $$;

-- 4. Seed cities table from eats_zones (if not already populated)
INSERT INTO cities (name, country, currency, is_active)
SELECT DISTINCT city_name, 'US', 'USD', true 
FROM eats_zones 
WHERE city_name IS NOT NULL 
  AND city_name != 'Default'
  AND city_name != ''
ON CONFLICT (name) DO NOTHING;

-- 5. Add city_id FK to eats_zones for linking
ALTER TABLE eats_zones 
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id);

-- 6. Link existing eats_zones to cities
UPDATE eats_zones ez
SET city_id = c.id
FROM cities c
WHERE c.name = ez.city_name
  AND ez.city_id IS NULL;

-- 7. Create index for faster restaurant filtering by city
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);

-- 8. Create index for order city filtering
CREATE INDEX IF NOT EXISTS idx_food_orders_city ON food_orders(city_name);