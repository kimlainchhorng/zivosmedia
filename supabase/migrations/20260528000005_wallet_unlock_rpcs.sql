-- Wallet-backed unlock RPCs for PPV and Paid DMs.
-- Atomic: locks both wallets, checks balance, debits unlocker, credits creator,
-- inserts the unlock row, writes both ledger entries. Raises insufficient_funds
-- if the unlocker doesn't have enough money in user_wallets.available_cents.
--
-- Pattern mirrors accept_p2p_transfer but uses user_wallets (the canonical
-- end-user wallet shown on /wallet) rather than customer_wallets (driver-scoped).

-- ── PPV: unlock_ppv_with_wallet(p_ppv_id) ────────────────────────────────────
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

  -- Idempotency: if the user already unlocked this post, return the prior row.
  SELECT id INTO v_existing_unlock_id
  FROM public.ppv_unlocks
  WHERE ppv_id = p_ppv_id AND unlocker_id = v_uid;

  IF v_existing_unlock_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.ppv_unlocks WHERE id = v_existing_unlock_id;
    RETURN v_existing;
  END IF;

  v_amount := COALESCE(v_post.price_cents, 0);

  -- Ensure both wallets exist (idempotent), then lock in deterministic order
  -- to prevent deadlocks under concurrent unlocks.
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

-- ── Paid DM: unlock_dm_with_wallet(p_message_id) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.unlock_dm_with_wallet(p_message_id uuid)
RETURNS public.direct_message_unlocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid                uuid := auth.uid();
  v_msg                public.direct_messages;
  v_existing_unlock_id uuid;
  v_existing           public.direct_message_unlocks;
  v_amount             integer;
  v_buyer_balance      integer;
  v_new_buyer_balance  integer;
  v_new_seller_balance integer;
  v_unlock             public.direct_message_unlocks;
  v_a uuid;
  v_b uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_msg FROM public.direct_messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found';
  END IF;

  -- Only the recipient can unlock.
  IF v_msg.receiver_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_msg.locked_price_cents IS NULL OR v_msg.locked_price_cents = 0 THEN
    RAISE EXCEPTION 'message_not_locked';
  END IF;

  SELECT id INTO v_existing_unlock_id
  FROM public.direct_message_unlocks
  WHERE message_id = p_message_id AND unlocker_id = v_uid;

  IF v_existing_unlock_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.direct_message_unlocks WHERE id = v_existing_unlock_id;
    RETURN v_existing;
  END IF;

  v_amount := v_msg.locked_price_cents;

  INSERT INTO public.user_wallets (user_id, available_cents, pending_cents, currency)
    VALUES (v_uid, 0, 0, 'USD')
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_wallets (user_id, available_cents, pending_cents, currency)
    VALUES (v_msg.sender_id, 0, 0, 'USD')
    ON CONFLICT (user_id) DO NOTHING;

  IF v_uid < v_msg.sender_id THEN
    v_a := v_uid; v_b := v_msg.sender_id;
  ELSE
    v_a := v_msg.sender_id; v_b := v_uid;
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
   WHERE user_id = v_msg.sender_id
   RETURNING available_cents INTO v_new_seller_balance;

  INSERT INTO public.direct_message_unlocks (
    message_id, unlocker_id, creator_id,
    amount_cents_paid, currency, payment_provider, payment_ref
  )
  VALUES (
    p_message_id, v_uid, v_msg.sender_id,
    v_amount, 'usd', 'wallet', NULL
  )
  RETURNING * INTO v_unlock;

  INSERT INTO public.user_wallet_transactions
    (user_id, kind, amount_cents, balance_after_cents, currency, description, reference_id)
  VALUES
    (v_uid,            'purchase', -v_amount, v_new_buyer_balance,  'USD', 'Paid DM unlock',  v_unlock.id),
    (v_msg.sender_id,  'reward',    v_amount, v_new_seller_balance, 'USD', 'Paid DM revenue', v_unlock.id);

  RETURN v_unlock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_dm_with_wallet(uuid) TO authenticated;
