-- Allow public read access to zone_pricing_rates
-- This is safe because pricing rates are not sensitive data
-- All users (logged in or not) need to see prices before booking
CREATE POLICY "Allow public read access to zone_pricing_rates"
  ON public.zone_pricing_rates
  FOR SELECT
  USING (true);