-- Add a salesperson_name text column to car_dealership_leads, mirroring the
-- existing column on car_dealership_sales. Free-text by design: a "team
-- members" table is out of scope for this iteration and the sales side
-- already uses this pattern (Reports buckets revenue by salesperson_name).
-- The new partial index supports the per-store filter on the Leads tab.

ALTER TABLE public.car_dealership_leads
  ADD COLUMN IF NOT EXISTS salesperson_name text;

CREATE INDEX IF NOT EXISTS car_dealership_leads_salesperson_idx
  ON public.car_dealership_leads (store_id, salesperson_name)
  WHERE salesperson_name IS NOT NULL;
