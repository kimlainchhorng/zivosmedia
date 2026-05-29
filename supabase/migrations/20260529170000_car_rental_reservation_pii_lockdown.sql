-- SECURITY (HIGH): stop anonymous enumeration of car-rental reservation PII + Stripe data.
--
-- The "Public lookup reservation by code" policy is USING(true) for {anon,authenticated},
-- which let anyone with the public anon key read EVERY reservation (names, phones,
-- emails, Stripe IDs). The public booking flow legitimately needs to read only
-- NON-sensitive columns (vehicle_id, dates, status, confirmation_code, payment_status)
-- for availability, create read-back, and payment-status polling — never PII.
--
-- Fix: revoke column-level SELECT on the sensitive columns FROM anon (the REST API
-- enforces column privileges), so the anon key can no longer read PII/Stripe even
-- though the row policy still matches. The two public pages that DO need the full
-- record (lookup-by-code detail page, review page) go through a SECURITY DEFINER
-- function instead. The booking/availability/payment code is untouched.

revoke select (
  customer_id, customer_name, customer_phone, customer_email, customer_notes,
  internal_notes, damage_notes, damage_photos, damage_marks,
  cancellation_reason, created_by_user_id,
  refund_amount_cents, refund_at, refund_method,
  stripe_customer_id, stripe_payment_intent_id, stripe_balance_payment_intent_id,
  stripe_payment_method_id, stripe_charge_id, stripe_refund_id,
  last_payment_error, payment_lock_token, payment_lock_expires_at,
  stripe_last_event_at, stripe_last_event_type
) on public.car_rental_reservations from anon;

-- Single-reservation read for the public detail (by confirmation code) and review
-- (by id) pages. Runs as definer so it returns the full record for the one matching
-- reservation only — no enumeration possible (must know the exact code or id).
create or replace function public.get_car_rental_reservation(
  p_code text default null,
  p_id uuid default null
)
returns setof public.car_rental_reservations
language sql
security definer
set search_path = public
as $$
  select *
  from public.car_rental_reservations
  where (p_code is not null and confirmation_code = upper(trim(p_code)))
     or (p_id  is not null and id = p_id)
  limit 1;
$$;

grant execute on function public.get_car_rental_reservation(text, uuid) to anon, authenticated;

-- Reservation events have no public consumer (only the owner audit log reads them);
-- drop the blanket public-read policy. Owner/admin policies remain.
drop policy if exists "Public read reservation events" on public.car_rental_reservation_events;
