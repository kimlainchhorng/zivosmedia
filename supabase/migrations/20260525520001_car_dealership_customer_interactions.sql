------------------------------------------------------------------------
-- Car dealership — per-customer interactions log
--
-- Mirrors `car_dealership_lead_activities` but bound to a customer instead
-- of a lead. Immutable by design (no updated_at, no trigger): each row is
-- a logged touchpoint that the admin doesn't edit, only deletes if wrong.
--
-- Used by the Customer 360 sheet's new "Comms" tab to show a timeline of
-- calls, emails, visits, SMS, and notes for a given customer.
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.car_dealership_customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  interaction_type TEXT NOT NULL
    CHECK (interaction_type IN ('note', 'call', 'email', 'sms', 'visit', 'meeting', 'letter', 'other')),
  direction TEXT
    CHECK (direction IS NULL OR direction IN ('inbound', 'outbound')),

  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 500),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 4000),
  outcome TEXT CHECK (outcome IS NULL OR char_length(outcome) <= 200),

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_customer_interactions_customer_idx
  ON public.car_dealership_customer_interactions (customer_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS car_dealership_customer_interactions_store_idx
  ON public.car_dealership_customer_interactions (store_id, occurred_at DESC);

------------------------------------------------------------------------
-- RLS — owners + admins manage everything for their store.
------------------------------------------------------------------------

ALTER TABLE public.car_dealership_customer_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_dealership_customer_interactions - select"
  ON public.car_dealership_customer_interactions;
CREATE POLICY "Owners manage car_dealership_customer_interactions - select"
  ON public.car_dealership_customer_interactions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_customer_interactions.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners manage car_dealership_customer_interactions - insert"
  ON public.car_dealership_customer_interactions;
CREATE POLICY "Owners manage car_dealership_customer_interactions - insert"
  ON public.car_dealership_customer_interactions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_customer_interactions.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners manage car_dealership_customer_interactions - update"
  ON public.car_dealership_customer_interactions;
CREATE POLICY "Owners manage car_dealership_customer_interactions - update"
  ON public.car_dealership_customer_interactions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_customer_interactions.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_customer_interactions.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners manage car_dealership_customer_interactions - delete"
  ON public.car_dealership_customer_interactions;
CREATE POLICY "Owners manage car_dealership_customer_interactions - delete"
  ON public.car_dealership_customer_interactions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_customer_interactions.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

COMMENT ON TABLE public.car_dealership_customer_interactions IS
  'Immutable touchpoint log for car dealership customers (calls, emails, visits, SMS, notes). Append-only from the UI; rows are deleted only if logged in error.';
