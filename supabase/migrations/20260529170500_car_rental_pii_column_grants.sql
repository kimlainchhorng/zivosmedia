-- Correction to 20260529170000: a column-level REVOKE is a no-op when the role
-- holds a table-wide SELECT grant (Supabase's default grant-all + RLS model).
-- To actually column-scope anon, revoke the table-level SELECT and re-grant only
-- the non-sensitive columns the public booking flow needs (availability checks,
-- create read-back, and payment-status polling). PII + Stripe columns stay hidden
-- from anon; the detail/review pages read full rows via get_car_rental_reservation().

revoke select on public.car_rental_reservations from anon;

grant select (
  id, store_id, vehicle_id, pickup_at, dropoff_at, status, confirmation_code, payment_status
) on public.car_rental_reservations to anon;
