-- Force share-to-earn referral writes and reward credits through share-to-earn-manage.
-- Wallet and loyalty reward issuance require trusted server-side reward validation.

CREATE TABLE IF NOT EXISTS public.user_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_referral_codes
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS user_referral_codes_user_id_uidx
  ON public.user_referral_codes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_referral_codes_referral_code_uidx
  ON public.user_referral_codes(referral_code);

CREATE TABLE IF NOT EXISTS public.referral_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_shares
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS referrer_id UUID,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS referral_shares_referrer_id_idx
  ON public.referral_shares(referrer_id, shared_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  referrer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  order_id TEXT,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_conversions
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS buyer_id UUID,
  ADD COLUMN IF NOT EXISTS referrer_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS order_id TEXT,
  ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS referral_conversions_buyer_pending_idx
  ON public.referral_conversions(buyer_id, status);

ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own referral code" ON public.user_referral_codes;
CREATE POLICY "Users can read own referral code"
ON public.user_referral_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_referral_codes_block_direct_insert ON public.user_referral_codes;
DROP POLICY IF EXISTS "user_referral_codes_block_direct_insert" ON public.user_referral_codes;
CREATE POLICY "user_referral_codes_block_direct_insert"
ON public.user_referral_codes
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS user_referral_codes_block_direct_update ON public.user_referral_codes;
DROP POLICY IF EXISTS "user_referral_codes_block_direct_update" ON public.user_referral_codes;
CREATE POLICY "user_referral_codes_block_direct_update"
ON public.user_referral_codes
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS user_referral_codes_block_direct_delete ON public.user_referral_codes;
DROP POLICY IF EXISTS "user_referral_codes_block_direct_delete" ON public.user_referral_codes;
CREATE POLICY "user_referral_codes_block_direct_delete"
ON public.user_referral_codes
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS referral_shares_block_direct_insert ON public.referral_shares;
DROP POLICY IF EXISTS "referral_shares_block_direct_insert" ON public.referral_shares;
CREATE POLICY "referral_shares_block_direct_insert"
ON public.referral_shares
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS referral_shares_block_direct_update ON public.referral_shares;
DROP POLICY IF EXISTS "referral_shares_block_direct_update" ON public.referral_shares;
CREATE POLICY "referral_shares_block_direct_update"
ON public.referral_shares
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS referral_shares_block_direct_delete ON public.referral_shares;
DROP POLICY IF EXISTS "referral_shares_block_direct_delete" ON public.referral_shares;
CREATE POLICY "referral_shares_block_direct_delete"
ON public.referral_shares
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS referral_conversions_block_direct_update ON public.referral_conversions;
DROP POLICY IF EXISTS "referral_conversions_block_direct_update" ON public.referral_conversions;
CREATE POLICY "referral_conversions_block_direct_update"
ON public.referral_conversions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS referral_conversions_block_direct_delete ON public.referral_conversions;
DROP POLICY IF EXISTS "referral_conversions_block_direct_delete" ON public.referral_conversions;
CREATE POLICY "referral_conversions_block_direct_delete"
ON public.referral_conversions
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.user_referral_codes IS
'Referral codes are created by share-to-earn-manage after trusted server-side reward validation.';
COMMENT ON TABLE public.referral_shares IS
'Referral share events are written by share-to-earn-manage after trusted server-side reward validation.';
COMMENT ON TABLE public.referral_conversions IS
'Referral conversion crediting is completed by share-to-earn-manage after trusted server-side reward validation.';
