-- Close the subscriber-tier paywall bypass introduced by 09c7f79ba.
--
-- The new "free for subscribers" shortcut in unlock_ppv_with_wallet treated
-- any row in creator_subscriptions with status='active' as proof of
-- payment. But creator_subscriptions had open INSERT / UPDATE policies for
-- the row's subscriber (cs_ins, cs_upd from 20260403142647), so the client
-- could forge an "active" row with no Stripe payment and short-circuit the
-- wallet debit. Two REST calls → free PPV media.
--
-- Same shape as 5f4c33b55's Vuln 1 — just one indirection up.
--
-- This migration does belt-and-suspenders:
--
--   1. Revert unlock_ppv_with_wallet to the pre-09c7f79ba version. The
--      ppv_posts.free_for_subscribers column stays in place for the
--      eventual proper feature, but no code path consults it any more.
--      This alone closes the immediate bypass.
--
--   2. Drop the public UPDATE policy on creator_subscriptions. No client
--      UPDATEs exist in the codebase (cancel flows already use the
--      cancel-creator-subscription edge function which runs as
--      service_role), so dropping is safe.
--
--   3. Replace the public INSERT policy with one that only allows free
--      tiers. Paid-tier subscriptions must move into the
--      subscribe-to-tier-intent edge function (which can write via
--      service_role after verifying Stripe payment). The client-side
--      direct INSERT in SubscribeInAppSheet.tsx:77 will start failing
--      RLS until that edge function is updated — by design.

-- ─── Step 1: revert unlock_ppv_with_wallet (drop the free-for-subs path) ──────
CREATE OR REPLACE FUNCTION public.unlock_ppv_with_wallet(p_ppv_id uuid)
RETURNS public.ppv_unlocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid                uuid := auth.uid();
  v_post               public.ppv_posts;
  v_existing_unlock_id uuid;
  v_existing           public.ppv_unlocks;
  v_amount             integer;
  v_buyer_balance      integer;
  v_new_buyer_balance  integer;
  v_new_seller_balance integer;
  v_unlock             public.ppv_unlocks;
  v_a uuid;
  v_b uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_post FROM public.ppv_posts WHERE id = p_ppv_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ppv_not_found';
  END IF;

  IF v_post.creator_id = v_uid THEN
    RAISE EXCEPTION 'cannot_unlock_own_post';
  END IF;

  SELECT id INTO v_existing_unlock_id
    FROM public.ppv_unlocks
    WHERE ppv_id = p_ppv_id AND unlocker_id = v_uid;
  IF v_existing_unlock_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ppv_unlocks WHERE id = v_existing_unlock_id;
    RETURN v_existing;
  END IF;

  v_amount := COALESCE(v_post.price_cents, 0);

  INSERT INTO public.user_wallets (user_id, available_cents, pending_cents, currency)
    VALUES (v_uid, 0, 0, 'USD')
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_wallets (user_id, available_cents, pending_cents, currency)
    VALUES (v_post.creator_id, 0, 0, 'USD')
    ON CONFLICT (user_id) DO NOTHING;

  IF v_uid < v_post.creator_id THEN
    v_a := v_uid; v_b := v_post.creator_id;
  ELSE
    v_a := v_post.creator_id; v_b := v_uid;
  END IF;
  PERFORM 1 FROM public.user_wallets WHERE user_id = v_a FOR UPDATE;
  PERFORM 1 FROM public.user_wallets WHERE user_id = v_b FOR UPDATE;

  SELECT available_cents INTO v_buyer_balance
    FROM public.user_wallets WHERE user_id = v_uid;
  IF v_buyer_balance < v_amount THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  UPDATE public.user_wallets
     SET available_cents = available_cents - v_amount, updated_at = now()
   WHERE user_id = v_uid
   RETURNING available_cents INTO v_new_buyer_balance;

  UPDATE public.user_wallets
     SET available_cents = available_cents + v_amount, updated_at = now()
   WHERE user_id = v_post.creator_id
   RETURNING available_cents INTO v_new_seller_balance;

  INSERT INTO public.ppv_unlocks (
    ppv_id, unlocker_id, creator_id,
    amount_cents_paid, currency, payment_provider, payment_ref
  )
  VALUES (
    p_ppv_id, v_uid, v_post.creator_id,
    v_amount, v_post.currency, 'wallet', NULL
  )
  RETURNING * INTO v_unlock;

  INSERT INTO public.user_wallet_transactions
    (user_id, kind, amount_cents, balance_after_cents, currency, description, reference_id)
  VALUES
    (v_uid,              'purchase', -v_amount, v_new_buyer_balance,  v_post.currency, 'PPV unlock',   v_unlock.id),
    (v_post.creator_id,  'reward',    v_amount, v_new_seller_balance, v_post.currency, 'PPV revenue',  v_unlock.id);

  RETURN v_unlock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_ppv_with_wallet(uuid) TO authenticated;

-- ─── Step 2: drop the public UPDATE policy ────────────────────────────────────
-- Status changes (cancel / expire) go through cancel-creator-subscription
-- which runs as service_role and bypasses RLS. No client code uses UPDATE.
DROP POLICY IF EXISTS "cs_upd" ON public.creator_subscriptions;

-- ─── Step 3: constrain INSERT to free tiers only ──────────────────────────────
-- Paid tiers must move to subscribe-to-tier-intent (service_role) after Stripe
-- verifies payment. Until that edge function is updated, paid-tier in-app
-- subscribe will fail with an RLS error — by design.
DROP POLICY IF EXISTS "cs_ins" ON public.creator_subscriptions;
CREATE POLICY "cs_ins_free_tier_only"
  ON public.creator_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = subscriber_id
    AND EXISTS (
      SELECT 1 FROM public.subscription_tiers t
       WHERE t.id = creator_subscriptions.tier_id
         AND t.creator_id = creator_subscriptions.creator_id
         AND t.is_free = true
    )
  );
