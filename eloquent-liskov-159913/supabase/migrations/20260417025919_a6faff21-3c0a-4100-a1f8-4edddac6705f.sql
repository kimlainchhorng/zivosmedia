
-- View: per-creator live gift earnings totals (1 coin = $0.01, 70% creator share)
CREATE OR REPLACE VIEW public.v_creator_live_earnings
WITH (security_invoker=on) AS
SELECT
  ls.user_id AS creator_id,
  COALESCE(SUM(lgd.coins), 0)::bigint AS total_coins_received,
  COUNT(lgd.id)::bigint AS total_gifts_received,
  COUNT(DISTINCT lgd.sender_id)::bigint AS unique_gifters,
  -- gross USD cents (1 coin = 1 cent), then 70% creator share
  FLOOR(COALESCE(SUM(lgd.coins), 0) * 0.70)::bigint AS earnings_cents,
  FLOOR(COALESCE(SUM(lgd.coins), 0) * 0.30)::bigint AS platform_fee_cents
FROM public.live_streams ls
LEFT JOIN public.live_gift_displays lgd
  ON lgd.stream_id = ls.id::text
GROUP BY ls.user_id;

-- View: per-stream live gift earnings breakdown
CREATE OR REPLACE VIEW public.v_creator_live_stream_earnings
WITH (security_invoker=on) AS
SELECT
  ls.id AS stream_id,
  ls.user_id AS creator_id,
  ls.title,
  ls.status,
  ls.started_at,
  ls.ended_at,
  ls.viewer_count,
  ls.like_count,
  COALESCE(SUM(lgd.coins), 0)::bigint AS coins_received,
  COUNT(lgd.id)::bigint AS gifts_received,
  COUNT(DISTINCT lgd.sender_id)::bigint AS unique_gifters,
  FLOOR(COALESCE(SUM(lgd.coins), 0) * 0.70)::bigint AS earnings_cents
FROM public.live_streams ls
LEFT JOIN public.live_gift_displays lgd
  ON lgd.stream_id = ls.id::text
GROUP BY ls.id, ls.user_id, ls.title, ls.status, ls.started_at, ls.ended_at, ls.viewer_count, ls.like_count;

-- Index to speed up join
CREATE INDEX IF NOT EXISTS idx_live_gift_displays_stream_id_text ON public.live_gift_displays (stream_id);

-- RPC: creator can request payout from their live-gift earnings
CREATE OR REPLACE FUNCTION public.request_live_earnings_payout(
  p_amount_cents integer,
  p_method text DEFAULT 'bank_transfer',
  p_reference_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_available bigint;
  v_pending bigint;
  v_paid bigint;
  v_payout_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount_cents < 1000 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $10.00';
  END IF;

  SELECT COALESCE(earnings_cents, 0) INTO v_available
  FROM public.v_creator_live_earnings WHERE creator_id = v_uid;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_pending
  FROM public.creator_payouts
  WHERE creator_id = v_uid AND status IN ('pending','processing') AND method LIKE 'live_gifts%';

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_paid
  FROM public.creator_payouts
  WHERE creator_id = v_uid AND status = 'paid' AND method LIKE 'live_gifts%';

  IF (COALESCE(v_available, 0) - v_pending - v_paid) < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient available earnings';
  END IF;

  INSERT INTO public.creator_payouts (
    creator_id, amount_cents, fee_cents, net_cents, method, reference_id, status
  ) VALUES (
    v_uid, p_amount_cents, 0, p_amount_cents, 'live_gifts:' || p_method, p_reference_id, 'pending'
  ) RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_live_earnings_payout(integer, text, text) TO authenticated;
