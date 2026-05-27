-- Performance fix: wrap auth.uid() in a sub-select so PostgREST evaluates it
-- once per query instead of once per row (Supabase auth_rls_initplan advisor).
-- Both new policies were created in 20260526130000_car_rental_stripe.sql.

DROP POLICY IF EXISTS "Admins view car-rental payment attempts" ON public.car_rental_payment_attempts;
CREATE POLICY "Admins view car-rental payment attempts"
  ON public.car_rental_payment_attempts FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins view car-rental webhook events" ON public.car_rental_stripe_webhook_events;
CREATE POLICY "Admins view car-rental webhook events"
  ON public.car_rental_stripe_webhook_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

-- Covering index for the FK auto-flagged by unindexed_foreign_keys.
CREATE INDEX IF NOT EXISTS car_rental_payment_attempts_customer_user_idx
  ON public.car_rental_payment_attempts (customer_user_id)
  WHERE customer_user_id IS NOT NULL;
