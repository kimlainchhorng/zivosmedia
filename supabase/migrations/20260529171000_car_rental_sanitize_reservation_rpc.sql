-- Converge the public reservation read path onto a single, SANITIZED RPC.
--
-- A pre-existing public.get_car_rental_reservation(p_code, p_id) returned
-- `SELECT *` (RETURNS SETOF car_rental_reservations), so although it required a
-- code/id it still handed the customer's browser every Stripe identifier,
-- internal_notes, payment_lock_token, last_payment_error, etc. The public
-- booking-detail and review pages already call this function, so we redefine it
-- here to return only the non-sensitive columns those pages actually need
-- (a superset covering both call sites: p_code -> detail page, p_id -> review
-- page). This replaces the narrower _by_code/_for_review helpers added in the
-- previous migration, which are dropped below.

DROP FUNCTION IF EXISTS public.get_car_rental_reservation(text, uuid);

CREATE FUNCTION public.get_car_rental_reservation(
  p_code text DEFAULT NULL,
  p_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  customer_id uuid,
  vehicle_id uuid,
  vehicle_label text,
  vehicle_category text,
  customer_name text,
  customer_phone text,
  customer_email text,
  pickup_location_name text,
  dropoff_location_name text,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  rental_days integer,
  daily_rate_cents integer,
  base_total_cents integer,
  addons_total_cents integer,
  insurance_total_cents integer,
  taxes_cents integer,
  fees_cents integer,
  discount_cents integer,
  security_deposit_cents integer,
  total_cents integer,
  deposit_paid_cents integer,
  amount_paid_cents integer,
  status text,
  confirmation_code text,
  customer_notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  payment_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id, r.store_id, r.customer_id, r.vehicle_id,
    r.vehicle_label, r.vehicle_category,
    r.customer_name, r.customer_phone, r.customer_email,
    r.pickup_location_name, r.dropoff_location_name,
    r.pickup_at, r.dropoff_at, r.rental_days,
    r.daily_rate_cents, r.base_total_cents, r.addons_total_cents,
    r.insurance_total_cents, r.taxes_cents, r.fees_cents,
    r.discount_cents, r.security_deposit_cents, r.total_cents,
    r.deposit_paid_cents, r.amount_paid_cents,
    r.status::text, r.confirmation_code, r.customer_notes,
    r.cancelled_at, r.cancellation_reason, r.payment_status
  FROM public.car_rental_reservations r
  WHERE (p_code IS NOT NULL AND r.confirmation_code = upper(btrim(p_code)))
     OR (p_id IS NOT NULL AND r.id = p_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_car_rental_reservation(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation(text, uuid) TO anon, authenticated, service_role;

-- Redundant now that get_car_rental_reservation is sanitized and serves both pages.
DROP FUNCTION IF EXISTS public.get_car_rental_reservation_by_code(text);
DROP FUNCTION IF EXISTS public.get_car_rental_reservation_for_review(uuid);
