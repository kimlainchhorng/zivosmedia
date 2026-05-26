
-- 1. Extend live_streams with the columns the app needs
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS host_name text,
  ADD COLUMN IF NOT EXISTS host_avatar text,
  ADD COLUMN IF NOT EXISTS coins_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gifts_received integer NOT NULL DEFAULT 0;

-- 2. Coin balance per user
CREATE TABLE IF NOT EXISTS public.user_coin_balances (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coin_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own balance" ON public.user_coin_balances;
CREATE POLICY "Users read own balance"
  ON public.user_coin_balances
  FOR SELECT
  USING (auth.uid() = user_id);

-- (No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions can mutate)

-- 3. Coin transaction ledger
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  kind text NOT NULL,
  reference_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_tx_user_created ON public.coin_transactions(user_id, created_at DESC);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own coin tx" ON public.coin_transactions;
CREATE POLICY "Users read own coin tx"
  ON public.coin_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Helper: ensure a balance row exists
CREATE OR REPLACE FUNCTION public.ensure_coin_balance(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_coin_balances (user_id, balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 5. Recharge coins (called from Add Coin sheet)
CREATE OR REPLACE FUNCTION public.recharge_coins(amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_balance integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF amount IS NULL OR amount <= 0 OR amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  PERFORM public.ensure_coin_balance(uid);

  UPDATE public.user_coin_balances
     SET balance = balance + amount,
         updated_at = now()
   WHERE user_id = uid
   RETURNING balance INTO new_balance;

  INSERT INTO public.coin_transactions (user_id, delta, kind, metadata)
  VALUES (uid, amount, 'recharge', jsonb_build_object('source', 'add_coin_sheet'));

  RETURN new_balance;
END;
$$;

-- 6. Send live gift (atomic: debit sender, credit host, insert display)
CREATE OR REPLACE FUNCTION public.send_live_gift(
  p_stream_id uuid,
  p_gift_name text,
  p_gift_icon text,
  p_coins integer,
  p_tier text DEFAULT 'standard',
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  total_coins integer;
  host uuid;
  sender_name text;
  sender_balance integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 999 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;
  IF p_coins IS NULL OR p_coins <= 0 THEN
    RAISE EXCEPTION 'Invalid coins';
  END IF;

  total_coins := p_coins * p_quantity;

  SELECT user_id INTO host FROM public.live_streams WHERE id = p_stream_id;
  IF host IS NULL THEN
    RAISE EXCEPTION 'Stream not found';
  END IF;

  PERFORM public.ensure_coin_balance(uid);

  -- Debit sender
  UPDATE public.user_coin_balances
     SET balance = balance - total_coins,
         updated_at = now()
   WHERE user_id = uid AND balance >= total_coins
   RETURNING balance INTO sender_balance;

  IF sender_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Credit host
  PERFORM public.ensure_coin_balance(host);
  UPDATE public.user_coin_balances
     SET balance = balance + total_coins,
         updated_at = now()
   WHERE user_id = host;

  -- Sender display name (best effort)
  SELECT COALESCE(p.full_name, p.username, 'Guest')
    INTO sender_name
    FROM public.profiles p
   WHERE p.user_id = uid
   LIMIT 1;
  IF sender_name IS NULL THEN sender_name := 'Guest'; END IF;

  -- Insert gift display (visible to all viewers)
  INSERT INTO public.live_gift_displays (
    stream_id, sender_id, sender_name, gift_name, gift_icon, coins, tier, expires_at
  ) VALUES (
    p_stream_id::text, uid, sender_name, p_gift_name, p_gift_icon, total_coins, p_tier, now() + interval '15 seconds'
  );

  -- Update stream totals
  UPDATE public.live_streams
     SET coins_earned = coins_earned + total_coins,
         gifts_received = gifts_received + p_quantity
   WHERE id = p_stream_id;

  -- Ledger
  INSERT INTO public.coin_transactions (user_id, delta, kind, reference_id, metadata)
  VALUES
    (uid,  -total_coins, 'gift_send',    p_stream_id::text,
       jsonb_build_object('gift', p_gift_name, 'qty', p_quantity, 'host', host)),
    (host,  total_coins, 'gift_receive', p_stream_id::text,
       jsonb_build_object('gift', p_gift_name, 'qty', p_quantity, 'sender', uid));

  RETURN jsonb_build_object('balance', sender_balance, 'total_coins', total_coins);
END;
$$;

-- 7. Auto-create empty balance row when a user signs up (best effort — no error if profiles trigger absent)
CREATE OR REPLACE FUNCTION public.handle_new_user_coin_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_coin_balances (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 8. Realtime publication (idempotent — ignore if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_viewers;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_likes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_gift_displays;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coin_balances;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.live_streams REPLICA IDENTITY FULL;
ALTER TABLE public.live_comments REPLICA IDENTITY FULL;
ALTER TABLE public.live_viewers REPLICA IDENTITY FULL;
ALTER TABLE public.live_likes REPLICA IDENTITY FULL;
ALTER TABLE public.live_gift_displays REPLICA IDENTITY FULL;
ALTER TABLE public.user_coin_balances REPLICA IDENTITY FULL;
