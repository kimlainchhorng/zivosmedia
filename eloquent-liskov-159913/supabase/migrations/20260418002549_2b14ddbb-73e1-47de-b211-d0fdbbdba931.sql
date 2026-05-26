-- Track Stripe coin purchases idempotently
CREATE TABLE IF NOT EXISTS public.coin_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  package_id text NOT NULL,
  coins integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON public.coin_purchases(user_id, created_at DESC);

ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own coin purchases" ON public.coin_purchases;
CREATE POLICY "Users read own coin purchases"
  ON public.coin_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Idempotent credit: only credits if status was pending; safe to call repeatedly.
CREATE OR REPLACE FUNCTION public.credit_coin_purchase(
  _user_id uuid,
  _session_id text,
  _package_id text,
  _coins integer,
  _amount_cents integer,
  _currency text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_paid boolean;
  v_new_balance integer;
BEGIN
  -- Insert or fetch existing row
  INSERT INTO public.coin_purchases (user_id, stripe_session_id, package_id, coins, amount_cents, currency, status)
  VALUES (_user_id, _session_id, _package_id, _coins, _amount_cents, _currency, 'pending')
  ON CONFLICT (stripe_session_id) DO NOTHING;

  -- Lock row + check status
  SELECT (status = 'paid') INTO v_already_paid
  FROM public.coin_purchases
  WHERE stripe_session_id = _session_id
  FOR UPDATE;

  IF v_already_paid THEN
    SELECT balance INTO v_new_balance FROM public.user_coin_balances WHERE user_id = _user_id;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  PERFORM public.ensure_coin_balance(_user_id);

  UPDATE public.user_coin_balances
     SET balance = balance + _coins, updated_at = now()
   WHERE user_id = _user_id
   RETURNING balance INTO v_new_balance;

  INSERT INTO public.coin_transactions (user_id, delta, kind, reference_id, metadata)
  VALUES (_user_id, _coins, 'recharge', _session_id,
          jsonb_build_object('source', 'stripe_checkout', 'package_id', _package_id, 'amount_cents', _amount_cents, 'currency', _currency));

  UPDATE public.coin_purchases
     SET status = 'paid', credited_at = now()
   WHERE stripe_session_id = _session_id;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_coin_purchase(uuid, text, text, integer, integer, text) FROM PUBLIC, anon, authenticated;