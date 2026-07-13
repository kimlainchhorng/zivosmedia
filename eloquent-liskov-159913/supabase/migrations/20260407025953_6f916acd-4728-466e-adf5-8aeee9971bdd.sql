
-- Add store-referral columns to existing merchant_referrals
ALTER TABLE public.merchant_referrals
  ADD COLUMN IF NOT EXISTS referrer_store_id UUID REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS referred_store_id UUID REFERENCES public.store_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_email TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT encode(gen_random_bytes(6), 'hex'),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_merchant_referrals_code ON public.merchant_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_merchant_referrals_ref_email ON public.merchant_referrals(referred_email);

-- RLS policies for store-based referrals
CREATE POLICY "Store owners view own referrals" ON public.merchant_referrals
  FOR SELECT TO authenticated
  USING (
    referrer_store_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = referrer_store_id AND sp.owner_id = auth.uid())
  );

CREATE POLICY "Store owners create referrals" ON public.merchant_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    referrer_store_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = referrer_store_id AND sp.owner_id = auth.uid())
  );

-- Function: accept a referral and grant both parties 1 month free boost
CREATE OR REPLACE FUNCTION public.accept_shop_referral(p_referral_code TEXT, p_new_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_id UUID;
  v_referrer_store UUID;
  v_boost_until TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  SELECT id, referrer_store_id INTO v_ref_id, v_referrer_store
    FROM merchant_referrals
    WHERE referral_code = p_referral_code AND status = 'pending'
    LIMIT 1;

  IF v_ref_id IS NULL THEN RETURN FALSE; END IF;

  UPDATE merchant_referrals
    SET status = 'accepted', referred_store_id = p_new_store_id, accepted_at = now()
    WHERE id = v_ref_id;

  INSERT INTO merchant_boosts (store_id, amount_cents, currency, paid_via, payment_ref, featured_until, status)
    VALUES (v_referrer_store, 0, 'USD', 'referral', p_referral_code, v_boost_until, 'active');

  INSERT INTO merchant_boosts (store_id, amount_cents, currency, paid_via, payment_ref, featured_until, status)
    VALUES (p_new_store_id, 0, 'USD', 'referral', p_referral_code, v_boost_until, 'active');

  RETURN TRUE;
END;
$$;
