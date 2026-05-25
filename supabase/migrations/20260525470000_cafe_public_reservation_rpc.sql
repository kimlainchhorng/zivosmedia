-- Lets anonymous customers request a reservation. Lands as status='pending'
-- so the owner can confirm/decline from the admin side. Bypasses the
-- owner-only RLS because of SECURITY DEFINER, but validates the payload
-- carefully so a hostile caller can't insert garbage.

CREATE OR REPLACE FUNCTION public.cafe_public_create_reservation(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_party_size integer,
  p_reserved_for timestamptz,
  p_duration_minutes integer DEFAULT 60,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_now timestamptz := now();
  v_name text := trim(p_customer_name);
  v_phone text := NULLIF(trim(p_customer_phone), '');
  v_notes text := NULLIF(trim(p_notes), '');
  v_party integer := COALESCE(p_party_size, 1);
  v_dur integer := COALESCE(p_duration_minutes, 60);
  v_store_active boolean;
BEGIN
  IF p_store_id IS NULL THEN RAISE EXCEPTION 'store_id is required'; END IF;
  SELECT is_active INTO v_store_active FROM public.store_profiles WHERE id = p_store_id;
  IF NOT FOUND OR NOT v_store_active THEN RAISE EXCEPTION 'cafe not available for reservations'; END IF;

  IF v_name = '' OR v_name IS NULL THEN RAISE EXCEPTION 'name is required'; END IF;
  IF v_party < 1 OR v_party > 50 THEN RAISE EXCEPTION 'party size must be between 1 and 50'; END IF;
  IF v_dur < 15 OR v_dur > 480 THEN RAISE EXCEPTION 'duration must be between 15 and 480 minutes'; END IF;
  IF p_reserved_for IS NULL OR p_reserved_for < v_now + interval '30 minutes' THEN
    RAISE EXCEPTION 'reserved_for must be at least 30 minutes from now';
  END IF;
  IF p_reserved_for > v_now + interval '60 days' THEN
    RAISE EXCEPTION 'reserved_for can''t be more than 60 days out';
  END IF;

  INSERT INTO public.cafe_reservations
    (store_id, customer_name, customer_phone, party_size, reserved_for, duration_minutes, status, notes)
  VALUES
    (p_store_id, v_name, v_phone, v_party, p_reserved_for, v_dur, 'pending', v_notes)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cafe_public_create_reservation(uuid, text, text, integer, timestamptz, integer, text) TO anon, authenticated;
