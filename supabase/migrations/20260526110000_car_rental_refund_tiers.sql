ALTER TABLE public.car_rental_store_settings
  ADD COLUMN IF NOT EXISTS refund_tiers JSONB NOT NULL
    DEFAULT '[{"days_before":7,"percent":100},{"days_before":1,"percent":50},{"days_before":0,"percent":0}]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'car_rental_store_settings_refund_tiers_is_array'
  ) THEN
    ALTER TABLE public.car_rental_store_settings
      ADD CONSTRAINT car_rental_store_settings_refund_tiers_is_array
      CHECK (jsonb_typeof(refund_tiers) = 'array');
  END IF;
END$$;
