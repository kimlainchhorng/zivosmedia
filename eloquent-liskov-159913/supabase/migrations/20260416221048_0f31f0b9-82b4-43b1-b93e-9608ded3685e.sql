
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

  UPDATE public.user_coin_balances
     SET balance = balance - total_coins,
         updated_at = now()
   WHERE user_id = uid AND balance >= total_coins
   RETURNING balance INTO sender_balance;

  IF sender_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  PERFORM public.ensure_coin_balance(host);
  UPDATE public.user_coin_balances
     SET balance = balance + total_coins,
         updated_at = now()
   WHERE user_id = host;

  SELECT COALESCE(p.full_name, 'Guest')
    INTO sender_name
    FROM public.profiles p
   WHERE p.user_id = uid OR p.id = uid
   LIMIT 1;
  IF sender_name IS NULL THEN sender_name := 'Guest'; END IF;

  INSERT INTO public.live_gift_displays (
    stream_id, sender_id, sender_name, gift_name, gift_icon, coins, tier, expires_at
  ) VALUES (
    p_stream_id::text, uid, sender_name, p_gift_name, p_gift_icon, total_coins, p_tier, now() + interval '15 seconds'
  );

  UPDATE public.live_streams
     SET coins_earned = coins_earned + total_coins,
         gifts_received = gifts_received + p_quantity
   WHERE id = p_stream_id;

  INSERT INTO public.coin_transactions (user_id, delta, kind, reference_id, metadata)
  VALUES
    (uid,  -total_coins, 'gift_send',    p_stream_id::text,
       jsonb_build_object('gift', p_gift_name, 'qty', p_quantity, 'host', host)),
    (host,  total_coins, 'gift_receive', p_stream_id::text,
       jsonb_build_object('gift', p_gift_name, 'qty', p_quantity, 'sender', uid));

  RETURN jsonb_build_object('balance', sender_balance, 'total_coins', total_coins);
END;
$$;
