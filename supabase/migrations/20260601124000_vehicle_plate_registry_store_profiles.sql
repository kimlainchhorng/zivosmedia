-- Fix the plate-registry ownership checks: auto-repair stores live in
-- public.store_profiles (owner_id = auth.uid()), not public.restaurants. The
-- original functions only checked restaurants, so real auto-repair owners were
-- rejected with "store owner access required". Check both store models.

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
  ON CONFLICT (plate_normalized, plate_state) DO UPDATE SET
    vin = EXCLUDED.vin,
    plate = EXCLUDED.plate,
    vehicle_year = COALESCE(EXCLUDED.vehicle_year, public.vehicle_plate_registry.vehicle_year),
    vehicle_make = COALESCE(EXCLUDED.vehicle_make, public.vehicle_plate_registry.vehicle_make),
    vehicle_model = COALESCE(EXCLUDED.vehicle_model, public.vehicle_plate_registry.vehicle_model),
    source_store_id = EXCLUDED.source_store_id,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_plate_vin(
  p_plate text,
  p_state text DEFAULT NULL
) RETURNS TABLE (
  plate text,
  plate_state text,
  vin text,
  vehicle_year integer,
  vehicle_make text,
  vehicle_model text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plate_norm text;
  v_state text;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::text)
    OR EXISTS (SELECT 1 FROM store_profiles r WHERE r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM restaurants r WHERE r.owner_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'store owner access required';
  END IF;

  v_plate_norm := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_state := upper(coalesce(p_state, ''));
  IF v_plate_norm = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.plate, r.plate_state, r.vin, r.vehicle_year, r.vehicle_make, r.vehicle_model
  FROM public.vehicle_plate_registry r
  WHERE r.plate_normalized = v_plate_norm
    AND (v_state = '' OR r.plate_state = v_state OR r.plate_state = '')
  ORDER BY (r.plate_state = v_state) DESC, r.updated_at DESC
  LIMIT 1;
END;
$$;
