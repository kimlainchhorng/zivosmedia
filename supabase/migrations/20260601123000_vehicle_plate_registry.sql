-- Platform-wide license-plate -> VIN registry.
--
-- Stores VEHICLE IDENTITY ONLY (plate, state, VIN, year/make/model) contributed by
-- any shop, so a different shop can later look up a plate it has never serviced and
-- get the VIN. Deliberately holds NO customer PII (no names, phones, emails): each
-- shop keeps its own customer records private; only the vehicle identity is shared.
--
-- All access goes through SECURITY DEFINER RPCs (no direct table reads/writes for
-- normal users), matching the project's RLS pattern.

CREATE TABLE IF NOT EXISTS public.vehicle_plate_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_normalized text NOT NULL,             -- uppercased, alphanumeric only (match key)
  plate text NOT NULL,                        -- display plate as entered
  plate_state text NOT NULL DEFAULT '',       -- '' when the contributor had no state
  vin text NOT NULL,
  vehicle_year integer,
  vehicle_make text,
  vehicle_model text,
  source_store_id uuid,                        -- audit only; never returned by lookup
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_plate_registry_plate_state
  ON public.vehicle_plate_registry (plate_normalized, plate_state);

ALTER TABLE public.vehicle_plate_registry ENABLE ROW LEVEL SECURITY;

-- No owner/anon policies: the table is reached only via the definer functions below.
-- Admins can still inspect/clean it directly.
DROP POLICY IF EXISTS "admin manage plate registry" ON public.vehicle_plate_registry;
CREATE POLICY "admin manage plate registry" ON public.vehicle_plate_registry
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Contribute (upsert) a plate->VIN identity. Caller must own the contributing store.
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
    EXISTS (SELECT 1 FROM restaurants r WHERE r.id = p_store_id AND r.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::text)
  ) THEN
    RAISE EXCEPTION 'not authorized for store %', p_store_id;
  END IF;

  v_plate_norm := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_state := upper(coalesce(p_state, ''));
  v_vin := upper(regexp_replace(coalesce(p_vin, ''), '[^A-Za-z0-9]', '', 'g'));

  -- Need a plate and a plausible VIN (most are 17; allow >=11 for older/partial).
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

GRANT EXECUTE ON FUNCTION public.register_plate_vin(uuid, text, text, text, integer, text, text) TO authenticated;

-- Look up a plate across the whole platform. Caller must be a store owner (any store)
-- or an admin. Returns vehicle identity only — never the contributing shop or any PII.
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
    EXISTS (SELECT 1 FROM restaurants r WHERE r.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::text)
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

GRANT EXECUTE ON FUNCTION public.lookup_plate_vin(text, text) TO authenticated;
