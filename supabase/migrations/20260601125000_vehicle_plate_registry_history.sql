-- Keep plate history in the registry. Previously a (plate, state) pair held a
-- single latest-wins row; when a plate is reissued to a different car the old VIN
-- was overwritten. Switch the unique key to (plate, state, VIN) so each distinct
-- VIN seen for a plate is its own row. lookup_plate_vin already returns the most
-- recently updated match, so callers still get the current vehicle.

DROP INDEX IF EXISTS public.uq_vehicle_plate_registry_plate_state;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_plate_registry_plate_state_vin
  ON public.vehicle_plate_registry (plate_normalized, plate_state, vin);

-- Helps the "latest match" ordering in lookups.
CREATE INDEX IF NOT EXISTS idx_vehicle_plate_registry_recent
  ON public.vehicle_plate_registry (plate_normalized, plate_state, updated_at DESC);

CREATE OR REPLACE FUNCTION public.register_plate_vin(
  p_store_id uuid,
  p_plate text,
  p_state text,
  p_vin text,
  p_year integer,
  p_make text,
  p_model text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plate_norm text;
  v_state text;
  v_vin text;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::text)
    OR EXISTS (SELECT 1 FROM store_profiles r WHERE r.id = p_store_id AND r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = p_store_id AND r.owner_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not authorized for store %', p_store_id;
  END IF;

  v_plate_norm := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_state := upper(coalesce(p_state, ''));
  v_vin := upper(regexp_replace(coalesce(p_vin, ''), '[^A-Za-z0-9]', '', 'g'));

  IF v_plate_norm = '' OR length(v_vin) < 11 THEN
    RETURN;
  END IF;

  INSERT INTO public.vehicle_plate_registry
    (plate_normalized, plate, plate_state, vin, vehicle_year, vehicle_make, vehicle_model, source_store_id, updated_at)
  VALUES
    (v_plate_norm, upper(p_plate), v_state, v_vin, p_year, nullif(p_make, ''), nullif(p_model, ''), p_store_id, now())
  ON CONFLICT (plate_normalized, plate_state, vin) DO UPDATE SET
    plate = EXCLUDED.plate,
    vehicle_year = COALESCE(EXCLUDED.vehicle_year, public.vehicle_plate_registry.vehicle_year),
    vehicle_make = COALESCE(EXCLUDED.vehicle_make, public.vehicle_plate_registry.vehicle_make),
    vehicle_model = COALESCE(EXCLUDED.vehicle_model, public.vehicle_plate_registry.vehicle_model),
    source_store_id = EXCLUDED.source_store_id,
    updated_at = now();
END;
$$;
