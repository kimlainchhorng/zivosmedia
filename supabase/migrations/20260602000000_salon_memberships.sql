-- Salon Memberships / Subscriptions
--
-- Owner-defined recurring-billing tiers (e.g. "Color Club · $99/mo · 15% off
-- services") that clients subscribe to via Stripe Subscriptions. Money flows
-- to the owner's Stripe Connect account, same destination-charges pattern as
-- the deposit + tipping flows.
--
-- Schema:
--   * salon_membership_tiers     — owner-managed tier catalog. Stripe
--                                 Product + Price ids are synced by the
--                                 `sync-salon-membership-tier` edge function
--                                 when the owner saves a tier.
--   * salon_client_memberships   — one row per subscriber. Status mirrors
--                                 Stripe's lifecycle (active / past_due /
--                                 cancelled / paused / trialing / incomplete).
--
-- RPCs:
--   * salon_public_get_membership_tiers       — public listing for signup
--                                              landing /salon/:slug/membership.
--   * salon_get_active_membership_for_client  — owner-side lookup used by
--                                              SalonCheckoutDialog to auto-
--                                              apply the member discount.

------------------------------------------------------------------------------
-- 1. salon_membership_tiers
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),

  -- Stored in cents to match all the other money columns in the salon
  -- module. Recurring amount per billing_interval.
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents > 0),
  billing_interval TEXT NOT NULL DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'year')),

  -- Discount applied to the service subtotal at checkout when a booking's
  -- client has an active membership in this tier. Retail + tip are NOT
  -- discounted by convention (matches the standard salon-industry POS).
  service_discount_percent INTEGER NOT NULL DEFAULT 0
    CHECK (service_discount_percent BETWEEN 0 AND 100),

  -- Stripe Product + Price are populated by sync-salon-membership-tier
  -- AFTER the row is created. Length-capped to keep malformed ids out of
  -- the indexes.
  stripe_product_id TEXT
    CHECK (stripe_product_id IS NULL OR char_length(stripe_product_id) <= 64),
  stripe_price_id TEXT
    CHECK (stripe_price_id IS NULL OR char_length(stripe_price_id) <= 64),

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_membership_tiers_store_idx
  ON public.salon_membership_tiers (store_id, sort_order);
CREATE INDEX IF NOT EXISTS salon_membership_tiers_active_idx
  ON public.salon_membership_tiers (store_id)
  WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS salon_membership_tiers_stripe_price_uidx
  ON public.salon_membership_tiers (stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

DROP TRIGGER IF EXISTS salon_membership_tiers_set_updated_at ON public.salon_membership_tiers;
CREATE TRIGGER salon_membership_tiers_set_updated_at
  BEFORE UPDATE ON public.salon_membership_tiers
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_membership_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active tiers"
  ON public.salon_membership_tiers
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_membership_tiers.store_id
        AND sp.is_active = true
    )
  );

CREATE POLICY "Owners manage tiers - all"
  ON public.salon_membership_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_membership_tiers.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_membership_tiers.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

------------------------------------------------------------------------------
-- 2. salon_client_memberships
------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salon_membership_status') THEN
    CREATE TYPE public.salon_membership_status AS ENUM (
      'incomplete',
      'trialing',
      'active',
      'past_due',
      'paused',
      'cancelled'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.salon_client_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.salon_clients(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.salon_membership_tiers(id) ON DELETE RESTRICT,

  status public.salon_membership_status NOT NULL DEFAULT 'incomplete',

  -- Stripe ids. subscription_id is the canonical webhook lookup key.
  stripe_customer_id TEXT
    CHECK (stripe_customer_id IS NULL OR char_length(stripe_customer_id) <= 64),
  stripe_subscription_id TEXT
    CHECK (stripe_subscription_id IS NULL OR char_length(stripe_subscription_id) <= 64),
  stripe_checkout_session_id TEXT
    CHECK (stripe_checkout_session_id IS NULL OR char_length(stripe_checkout_session_id) <= 100),

  -- Lifecycle timestamps mirrored from Stripe.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_client_memberships_store_idx
  ON public.salon_client_memberships (store_id, status);
CREATE INDEX IF NOT EXISTS salon_client_memberships_client_idx
  ON public.salon_client_memberships (client_id, status);

-- Webhook lookup by subscription id.
CREATE UNIQUE INDEX IF NOT EXISTS salon_client_memberships_subscription_uidx
  ON public.salon_client_memberships (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- At most ONE active membership per client (per store). 'active' + 'trialing'
-- + 'past_due' all count as "currently in good standing"; cancelled/paused
-- can coexist with a new one.
CREATE UNIQUE INDEX IF NOT EXISTS salon_client_memberships_one_active_uidx
  ON public.salon_client_memberships (store_id, client_id)
  WHERE status IN ('active', 'trialing', 'past_due');

DROP TRIGGER IF EXISTS salon_client_memberships_set_updated_at ON public.salon_client_memberships;
CREATE TRIGGER salon_client_memberships_set_updated_at
  BEFORE UPDATE ON public.salon_client_memberships
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_client_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage memberships - all"
  ON public.salon_client_memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_client_memberships.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_client_memberships.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Clients can read their own memberships"
  ON public.salon_client_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_clients sc
      WHERE sc.id = salon_client_memberships.client_id
        AND sc.user_id = (SELECT auth.uid())
    )
  );

------------------------------------------------------------------------------
-- 3. Public signup-landing RPC. Returns active tiers in display order.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_membership_tiers(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_membership_tiers(p_store_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  monthly_price_cents INTEGER,
  billing_interval TEXT,
  service_discount_percent INTEGER,
  has_stripe_price BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.name, t.description,
    t.monthly_price_cents, t.billing_interval, t.service_discount_percent,
    (t.stripe_price_id IS NOT NULL) AS has_stripe_price
  FROM public.salon_membership_tiers t
  JOIN public.store_profiles sp ON sp.id = t.store_id
  WHERE t.store_id = p_store_id
    AND t.is_active = true
    AND sp.is_active = true
  ORDER BY t.sort_order ASC, t.monthly_price_cents ASC;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_membership_tiers(UUID)
  TO anon, authenticated;

------------------------------------------------------------------------------
-- 4. Owner-side "is this client a member?" RPC. Used by SalonCheckoutDialog
--    to surface the discount toggle. Returns the active membership + tier
--    discount, or empty if there's no current good-standing membership.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_get_active_membership_for_client(UUID);

CREATE OR REPLACE FUNCTION public.salon_get_active_membership_for_client(p_client_id UUID)
RETURNS TABLE (
  id UUID,
  tier_id UUID,
  tier_name TEXT,
  status TEXT,
  service_discount_percent INTEGER,
  current_period_end TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    m.id, m.tier_id, t.name AS tier_name,
    m.status::text, t.service_discount_percent, m.current_period_end
  FROM public.salon_client_memberships m
  JOIN public.salon_membership_tiers t ON t.id = m.tier_id
  WHERE m.client_id = p_client_id
    AND m.status IN ('active', 'trialing', 'past_due')
  ORDER BY
    -- 'active' > 'trialing' > 'past_due' so checkout shows the strongest
    -- claim if a client somehow has multiple.
    CASE m.status
      WHEN 'active' THEN 0
      WHEN 'trialing' THEN 1
      WHEN 'past_due' THEN 2
      ELSE 3
    END
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.salon_get_active_membership_for_client(UUID)
  TO authenticated;
