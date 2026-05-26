-- =====================================================================
-- Daily login coin reward + streak ladder. Real backend, no mocks.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.coin_daily_rewards (
  user_id      uuid NOT NULL,
  claim_date   date NOT NULL,
  amount       integer NOT NULL,
  streak_days  integer NOT NULL DEFAULT 1,
  claimed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);

ALTER TABLE public.coin_daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own daily rewards" ON public.coin_daily_rewards;
CREATE POLICY "Users see own daily rewards"
  ON public.coin_daily_rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Reward ladder: 50, 75, 100, 150, 200, 250, 500 (cycles weekly)
CREATE OR REPLACE FUNCTION public.claim_daily_coin_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  yest  date := today - 1;
  prev_streak integer;
  new_streak integer;
  reward integer;
  ladder integer[] := ARRAY[50, 75, 100, 150, 200, 250, 500];
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF EXISTS (SELECT 1 FROM public.coin_daily_rewards
              WHERE user_id = uid AND claim_date = today) THEN
    RAISE EXCEPTION 'Already claimed today';
  END IF;

  SELECT streak_days INTO prev_streak
    FROM public.coin_daily_rewards
   WHERE user_id = uid AND claim_date = yest;
  new_streak := COALESCE(prev_streak, 0) + 1;

  reward := ladder[((new_streak - 1) % array_length(ladder, 1)) + 1];

  PERFORM public.ensure_coin_balance(uid);
  UPDATE public.user_coin_balances
     SET balance = balance + reward, updated_at = now()
   WHERE user_id = uid;

  INSERT INTO public.coin_daily_rewards (user_id, claim_date, amount, streak_days)
  VALUES (uid, today, reward, new_streak);

  INSERT INTO public.coin_transactions (user_id, delta, kind, metadata)
  VALUES (uid, reward, 'daily_reward',
          jsonb_build_object('streak', new_streak, 'date', today));

  RETURN jsonb_build_object(
    'amount', reward,
    'streak', new_streak,
    'next_streak', new_streak + 1,
    'next_amount', ladder[(new_streak % array_length(ladder, 1)) + 1]
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_reward_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  prev_streak integer;
  last_claim date;
  next_streak integer;
  ladder integer[] := ARRAY[50, 75, 100, 150, 200, 250, 500];
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('claimed_today', false, 'streak', 0); END IF;

  SELECT claim_date, streak_days INTO last_claim, prev_streak
    FROM public.coin_daily_rewards
   WHERE user_id = uid
   ORDER BY claim_date DESC
   LIMIT 1;

  IF last_claim = today THEN
    RETURN jsonb_build_object(
      'claimed_today', true,
      'streak', prev_streak,
      'today_amount',
        (SELECT amount FROM public.coin_daily_rewards
          WHERE user_id = uid AND claim_date = today)
    );
  END IF;

  next_streak := CASE WHEN last_claim = today - 1 THEN prev_streak + 1 ELSE 1 END;

  RETURN jsonb_build_object(
    'claimed_today', false,
    'streak', COALESCE(prev_streak, 0),
    'next_streak', next_streak,
    'next_amount', ladder[((next_streak - 1) % array_length(ladder, 1)) + 1]
  );
END;
$$;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_daily_rewards;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.coin_daily_rewards REPLICA IDENTITY FULL;

GRANT EXECUTE ON FUNCTION public.claim_daily_coin_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_reward_status() TO authenticated;
