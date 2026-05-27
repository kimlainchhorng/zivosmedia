-- Subscriber-tier PPV unlock: paid subscribers of a creator get free access
-- to that creator's PPV posts that are flagged free_for_subscribers.
--
-- The OF model: a $X/month subscription is supposed to feel valuable. Without
-- this integration, subs and PPV were independent — a fan would pay twice.

ALTER TABLE public.ppv_posts
  ADD COLUMN IF NOT EXISTS free_for_subscribers boolean NOT NULL DEFAULT false;

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
  v_has_active_sub     boolean := false;
  v_amount             integer;
  v_buyer_balance      integer;
  v_new_buyer_balance  integer;
  v_new_seller_balance integer;
  v_unlock             public.ppv_unlocks;
  v_a uuid;
  v_b uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_post FROM public.ppv_posts WHERE id = p_ppv_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ppv_not_found'; END IF;
  IF v_post.creator_id = v_uid THEN RAISE EXCEPTION 'cannot_unlock_own_post'; END IF;

  -- Idempotency
  SELECT id INTO v_existing_unlock_id
    FROM public.ppv_unlocks
    WHERE ppv_id = p_ppv_id AND unlocker_id = v_uid;
  IF v_existing_unlock_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ppv_unlocks WHERE id = v_existing_unlock_id;
    RETURN v_existing;
  END IF;

  -- Subscriber-tier free path: if the post is flagged free_for_subscribers and
  -- the caller has an active subscription to this creator, insert a $0 unlock
  -- and short-circuit (no wallet movement, no ledger entries).
  IF v_post.free_for_subscribers THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.creator_subscriptions cs
      WHERE cs.creator_id = v_post.creator_id
        AND cs.subscriber_id = v_uid
        AND COALESCE(cs.status, '') = 'active'
        AND (cs.expires_at IS NULL OR cs.expires_at > now())
    ) INTO v_has_active_sub;

    IF v_has_active_sub THEN
      INSERT INTO public.ppv_unlocks (
        ppv_id, unlocker_id, creator_id,
        amount_cents_paid, currency, payment_provider, payment_ref
      )
      VALUES (
        p_ppv_id, v_uid, v_post.creator_id,
        0, v_post.currency, 'subscription', NULL
      )
      RETURNING * INTO v_unlock;
      RETURN v_unlock;
    END IF;
  END IF;

  -- Regular wallet path
  v_amount := COALESCE(v_post.price_cents, 0);

  INSERT INTO public.user_wallets (user_id, available_cents, pending_cents, currency)
    VALUES (v_uid, 0, 0, 'USD') ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_wallets (user_id, available_cents, pending_cents, currency)
    VALUES (v_post.creator_id, 0, 0, 'USD') ON CONFLICT (user_id) DO NOTHING;

  IF v_uid < v_post.creator_id THEN v_a := v_uid; v_b := v_post.creator_id;
  ELSE v_a := v_post.creator_id; v_b := v_uid; END IF;
  PERFORM 1 FROM public.user_wallets WHERE user_id = v_a FOR UPDATE;
  PERFORM 1 FROM public.user_wallets WHERE user_id = v_b FOR UPDATE;

  SELECT available_cents INTO v_buyer_balance
    FROM public.user_wallets WHERE user_id = v_uid;
  IF v_buyer_balance < v_amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

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
    (v_uid,             'purchase', -v_amount, v_new_buyer_balance,  v_post.currency, 'PPV unlock',  v_unlock.id),
    (v_post.creator_id, 'reward',    v_amount, v_new_seller_balance, v_post.currency, 'PPV revenue', v_unlock.id);

  RETURN v_unlock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_ppv_with_wallet(uuid) TO authenticated;
