-- =============================================
-- MULTI-CITY & REGION CONTROLS - Database Schema
-- =============================================

-- 1. Create regions table (master table for operational regions)
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Los Angeles Metro"
  city TEXT NOT NULL,                    -- "Los Angeles"
  state TEXT NOT NULL,                   -- "CA"
  country TEXT DEFAULT 'US',             -- "US"
  timezone TEXT DEFAULT 'America/Los_Angeles',
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  disabled_at TIMESTAMPTZ,               -- When region was disabled
  disabled_reason TEXT,                  -- Why region was disabled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_city_state UNIQUE (city, state)
);

CREATE INDEX idx_regions_active ON regions(is_active);
CREATE INDEX idx_regions_city_state ON regions(city, state);

-- 2. Create region_settings table (per-region configuration)
CREATE TABLE public.region_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  
  -- Commission Settings
  default_commission_pct NUMERIC(5,2) DEFAULT 20.00,
  eats_commission_pct NUMERIC(5,2) DEFAULT 25.00,
  move_commission_pct NUMERIC(5,2) DEFAULT 18.00,
  
  -- Dispatch Settings
  dispatch_mode TEXT DEFAULT 'auto' CHECK (dispatch_mode IN ('auto', 'broadcast', 'manual')),
  max_dispatch_radius_km NUMERIC(6,2) DEFAULT 10.00,
  broadcast_timeout_seconds INTEGER DEFAULT 30,
  
  -- Surge Settings
  surge_enabled BOOLEAN DEFAULT true,
  max_surge_multiplier NUMERIC(3,2) DEFAULT 3.00,
  
  -- Payout Settings
  payout_schedule TEXT DEFAULT 'weekly' CHECK (payout_schedule IN ('weekly', 'biweekly', 'instant')),
  minimum_payout_amount NUMERIC(10,2) DEFAULT 25.00,
  
  -- Service Toggles
  rides_enabled BOOLEAN DEFAULT true,
  eats_enabled BOOLEAN DEFAULT true,
  move_enabled BOOLEAN DEFAULT true,
  
  -- Additional Config
  config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_region_settings UNIQUE (region_id)
);

CREATE INDEX idx_region_settings_region ON region_settings(region_id);

-- 3. Create region_bonuses table (bonus campaigns per region)
CREATE TABLE public.region_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('trips_completed', 'earnings_goal', 'peak_hours', 'streak')),
  target_value INTEGER NOT NULL,        -- e.g., 20 trips
  bonus_amount NUMERIC(10,2) NOT NULL,  -- e.g., $50
  service_type TEXT CHECK (service_type IN ('rides', 'eats', 'move', 'all')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_region_bonuses_region ON region_bonuses(region_id);
CREATE INDEX idx_region_bonuses_active ON region_bonuses(is_active, starts_at, ends_at);

-- 4. Create region_change_logs table (audit trail)
CREATE TABLE public.region_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('driver', 'region', 'settings')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                  -- 'region_assigned', 'region_changed', 'region_disabled'
  old_region_id UUID REFERENCES regions(id),
  new_region_id UUID REFERENCES regions(id),
  changed_by UUID,                       -- Admin user ID
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_region_change_logs_entity ON region_change_logs(entity_type, entity_id);
CREATE INDEX idx_region_change_logs_created ON region_change_logs(created_at DESC);

-- 5. Modify drivers table - Add region fields
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id),
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS allowed_regions UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_drivers_region ON drivers(region_id);

-- 6. Modify trips table - Add region field
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_trips_region ON trips(region_id);

-- 7. Modify food_orders table - Add region field
ALTER TABLE food_orders
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_food_orders_region ON food_orders(region_id);

-- 8. Modify delivery_batches table - Add region field
ALTER TABLE delivery_batches
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_delivery_batches_region ON delivery_batches(region_id);

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_change_logs ENABLE ROW LEVEL SECURITY;

-- Regions: Admin can manage, anyone can read active regions
CREATE POLICY "Admin full access to regions"
  ON regions FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read active regions"
  ON regions FOR SELECT
  USING (is_active = true);

-- Region Settings: Admin only
CREATE POLICY "Admin full access to region_settings"
  ON region_settings FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can read region settings"
  ON region_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Region Bonuses: Admin can manage, drivers can read active
CREATE POLICY "Admin full access to region_bonuses"
  ON region_bonuses FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read active bonuses"
  ON region_bonuses FOR SELECT
  USING (is_active = true AND starts_at <= now() AND ends_at >= now());

-- Change Logs: Admin only
CREATE POLICY "Admin full access to region_change_logs"
  ON region_change_logs FOR ALL
  USING (public.is_admin(auth.uid()));

-- =============================================
-- Triggers
-- =============================================

-- Trigger to prevent driver self-updating region and log changes
CREATE OR REPLACE FUNCTION public.prevent_driver_region_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if region_id is actually changing
  IF OLD.region_id IS DISTINCT FROM NEW.region_id THEN
    -- Prevent non-admins from changing region
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Drivers cannot change their own region';
    END IF;
    
    -- Log the change
    INSERT INTO public.region_change_logs (entity_type, entity_id, action, old_region_id, new_region_id, changed_by)
    VALUES ('driver', NEW.id, 'region_changed', OLD.region_id, NEW.region_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS driver_region_change_trigger ON drivers;
CREATE TRIGGER driver_region_change_trigger
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_driver_region_self_update();

-- Trigger to auto-create settings when region is created
CREATE OR REPLACE FUNCTION public.create_region_settings_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.region_settings (region_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS region_settings_auto_create ON regions;
CREATE TRIGGER region_settings_auto_create
  AFTER INSERT ON regions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_region_settings_on_insert();

-- Trigger to update updated_at on regions
DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on region_settings
DROP TRIGGER IF EXISTS update_region_settings_updated_at ON region_settings;
CREATE TRIGGER update_region_settings_updated_at
  BEFORE UPDATE ON region_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Seed default region (optional - New York Metro)
-- =============================================
INSERT INTO public.regions (name, city, state, country, timezone, currency, is_active)
VALUES 
  ('New York Metro', 'New York', 'NY', 'US', 'America/New_York', 'USD', true),
  ('Los Angeles Metro', 'Los Angeles', 'CA', 'US', 'America/Los_Angeles', 'USD', true),
  ('Chicago Metro', 'Chicago', 'IL', 'US', 'America/Chicago', 'USD', true)
ON CONFLICT (city, state) DO NOTHING;