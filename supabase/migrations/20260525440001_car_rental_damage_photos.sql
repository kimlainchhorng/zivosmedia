-- Car rental — damage photo URLs captured at return.

ALTER TABLE public.car_rental_reservations
  ADD COLUMN IF NOT EXISTS damage_photos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Constrain the JSON shape: must be an array (no schema beyond that).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_rental_reservations_damage_photos_is_array'
  ) THEN
    ALTER TABLE public.car_rental_reservations
      ADD CONSTRAINT car_rental_reservations_damage_photos_is_array
      CHECK (jsonb_typeof(damage_photos) = 'array');
  END IF;
END$$;
