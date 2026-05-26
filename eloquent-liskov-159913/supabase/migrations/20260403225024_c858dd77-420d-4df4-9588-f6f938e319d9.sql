-- One-time sync: Update all Cambodia cities to match Phnom Penh pricing
UPDATE city_pricing AS target
SET 
  base_fare = source.base_fare,
  per_mile = source.per_mile,
  per_minute = source.per_minute,
  booking_fee = source.booking_fee,
  minimum_fare = source.minimum_fare,
  card_fee_pct = source.card_fee_pct,
  is_active = source.is_active,
  updated_at = now()
FROM city_pricing AS source
WHERE source.city = 'Phnom Penh'
  AND source.ride_type = target.ride_type
  AND target.city != 'Phnom Penh'
  AND target.city IN (
    'Siem Reap', 'Battambang', 'Sihanoukville', 'Kampong Cham', 'Poipet',
    'Kampot', 'Takeo', 'Svay Rieng', 'Prey Veng', 'Pursat', 'Kratie',
    'Koh Kong', 'Stung Treng', 'Ratanakiri', 'Mondulkiri', 'Pailin',
    'Kep', 'Banteay Meanchey', 'Kandal', 'Kampong Chhnang', 'Kampong Speu',
    'Kampong Thom', 'Preah Vihear', 'Oddar Meanchey', 'Tboung Khmum'
  );

-- Create trigger function to auto-sync Phnom Penh changes to all Cambodia cities
CREATE OR REPLACE FUNCTION public.sync_phnom_penh_pricing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.city = 'Phnom Penh' THEN
    UPDATE city_pricing
    SET 
      base_fare = NEW.base_fare,
      per_mile = NEW.per_mile,
      per_minute = NEW.per_minute,
      booking_fee = NEW.booking_fee,
      minimum_fare = NEW.minimum_fare,
      card_fee_pct = NEW.card_fee_pct,
      is_active = NEW.is_active,
      updated_at = now()
    WHERE ride_type = NEW.ride_type
      AND city != 'Phnom Penh'
      AND city IN (
        'Siem Reap', 'Battambang', 'Sihanoukville', 'Kampong Cham', 'Poipet',
        'Kampot', 'Takeo', 'Svay Rieng', 'Prey Veng', 'Pursat', 'Kratie',
        'Koh Kong', 'Stung Treng', 'Ratanakiri', 'Mondulkiri', 'Pailin',
        'Kep', 'Banteay Meanchey', 'Kandal', 'Kampong Chhnang', 'Kampong Speu',
        'Kampong Thom', 'Preah Vihear', 'Oddar Meanchey', 'Tboung Khmum'
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on city_pricing
DROP TRIGGER IF EXISTS trg_sync_phnom_penh_pricing ON city_pricing;
CREATE TRIGGER trg_sync_phnom_penh_pricing
AFTER INSERT OR UPDATE ON city_pricing
FOR EACH ROW
EXECUTE FUNCTION public.sync_phnom_penh_pricing();
