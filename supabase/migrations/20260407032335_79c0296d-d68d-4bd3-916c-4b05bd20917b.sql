
-- 1. Fix profiles SELECT policy: owner-only + admin
DROP POLICY IF EXISTS "zivo_profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix shadow_bans INSERT: admin-only
DROP POLICY IF EXISTS "sb_ins" ON public.shadow_bans;
CREATE POLICY "sb_ins_admin" ON public.shadow_bans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix customer_feedback INSERT: must have ordered from that restaurant
DROP POLICY IF EXISTS "customer_feedback_public_insert" ON public.customer_feedback;
CREATE POLICY "customer_feedback_verified_insert" ON public.customer_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.food_orders fo
      WHERE fo.restaurant_id = customer_feedback.restaurant_id
        AND fo.customer_id = auth.uid()
        AND fo.status = 'delivered'
    )
  );

-- 4. Platform fee ledger
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type TEXT NOT NULL,
  order_id TEXT NOT NULL,
  merchant_id UUID,
  gross_amount_cents INTEGER NOT NULL,
  fee_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  fee_amount_cents INTEGER NOT NULL,
  waived BOOLEAN DEFAULT false,
  waiver_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr_all_fees" ON public.platform_fee_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_read_fees" ON public.platform_fee_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Merchant fee waivers
CREATE TABLE IF NOT EXISTS public.merchant_fee_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'referral',
  waiver_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  referral_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_fee_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr_all_waivers" ON public.merchant_fee_waivers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "merchants_view_own_waivers" ON public.merchant_fee_waivers
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.store_profiles WHERE owner_id = auth.uid()
    )
  );

-- 6. Updated referral acceptance: 0% fees for 30 days
CREATE OR REPLACE FUNCTION public.accept_shop_referral_v2(
  p_referral_code TEXT,
  p_new_store_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_store UUID;
BEGIN
  SELECT id, referrer_store_id, status
    INTO v_referral
    FROM merchant_referrals
    WHERE referral_code = p_referral_code
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referral.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already used');
  END IF;

  v_referrer_store := v_referral.referrer_store_id;

  UPDATE merchant_referrals
    SET status = 'accepted',
        referred_store_id = p_new_store_id,
        accepted_at = now()
    WHERE id = v_referral.id;

  -- Grant 30 days 0% fees to referrer
  INSERT INTO merchant_fee_waivers (store_id, reason, waiver_pct, starts_at, expires_at, referral_id)
  VALUES (v_referrer_store, 'referral_reward', 100.00, now(), now() + interval '30 days', v_referral.id);

  -- Grant 30 days 0% fees to referred shop
  INSERT INTO merchant_fee_waivers (store_id, reason, waiver_pct, starts_at, expires_at, referral_id)
  VALUES (p_new_store_id, 'referral_welcome', 100.00, now(), now() + interval '30 days', v_referral.id);

  RETURN jsonb_build_object('success', true);
END;
$$;
