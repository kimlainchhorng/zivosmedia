-- RPC for the public detail page's "Schedule test drive" form.
-- Anonymous visitors can't INSERT into car_dealership_test_drives directly
-- (RLS only allows store owners/admins). This SECURITY DEFINER function
-- accepts the public form fields, validates that the vehicle belongs to an
-- active row in the requested store, that the scheduled time is in the
-- future and not absurdly far out, then inserts a 'scheduled' test-drive row
-- and returns its id. The matching lead row is created client-side; its id
-- is passed in here so the two records cross-link.

CREATE OR REPLACE FUNCTION public.schedule_public_test_drive(
  p_store_id       uuid,
  p_vehicle_id     uuid,
  p_scheduled_at   timestamptz,
  p_customer_name  text,
  p_customer_phone text DEFAULT NULL,
  p_notes          text DEFAULT NULL,
  p_lead_id        uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id           uuid;
  v_label        text;
  v_clean_name   text := btrim(coalesce(p_customer_name, ''));
BEGIN
  IF p_store_id IS NULL OR p_vehicle_id IS NULL OR p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF p_scheduled_at <= now() THEN
    RAISE EXCEPTION 'Test drive must be scheduled in the future';
  END IF;
  IF p_scheduled_at > now() + interval '180 days' THEN
    RAISE EXCEPTION 'Test drive cannot be more than 180 days out';
  END IF;

  -- Verify the vehicle belongs to the store and is sellable.
  SELECT
    trim(both ' ' from
      coalesce(v.year::text, '') || ' ' || v.make || ' ' || v.model ||
      coalesce(' ' || v.trim, '')
    )
  INTO v_label
  FROM public.car_dealership_vehicles v
  WHERE v.id = p_vehicle_id
    AND v.store_id = p_store_id
    AND v.is_active = true
    AND v.status <> 'retired'::car_dealership_vehicle_status;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'Vehicle is not available for test drive';
  END IF;

  INSERT INTO public.car_dealership_test_drives (
    store_id, vehicle_id, lead_id, customer_name, customer_phone,
    vehicle_label, scheduled_at, duration_minutes, status, notes
  ) VALUES (
    p_store_id, p_vehicle_id, p_lead_id, v_clean_name,
    nullif(btrim(coalesce(p_customer_phone, '')), ''),
    v_label, p_scheduled_at, 30, 'scheduled', nullif(btrim(coalesce(p_notes, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_public_test_drive(uuid, uuid, timestamptz, text, text, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.schedule_public_test_drive(uuid, uuid, timestamptz, text, text, text, uuid) TO anon, authenticated;
