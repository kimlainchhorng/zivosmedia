
-- User interest tags for AI recommendation engine
CREATE TABLE IF NOT EXISTS public.user_interest_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'view',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_interest_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_interest_tags_user ON public.user_interest_tags(user_id);
CREATE INDEX idx_user_interest_tags_category ON public.user_interest_tags(category, score DESC);

CREATE POLICY "Users view own tags" ON public.user_interest_tags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own tags" ON public.user_interest_tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tags" ON public.user_interest_tags
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Function to increment a user's interest in a category
CREATE OR REPLACE FUNCTION public.track_user_interest(
  p_user_id UUID,
  p_category TEXT,
  p_source TEXT DEFAULT 'view',
  p_weight NUMERIC DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_interest_tags (user_id, category, score, source, last_seen_at)
  VALUES (p_user_id, p_category, p_weight, p_source, now())
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    score = user_interest_tags.score + p_weight,
    source = p_source,
    last_seen_at = now();
END;
$$;

-- Function to get trending stores near a user based on their interests
CREATE OR REPLACE FUNCTION public.get_trending_near_user(
  p_user_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  store_id UUID,
  store_name TEXT,
  category TEXT,
  relevance_score NUMERIC,
  is_featured BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id AS store_id,
    sp.name AS store_name,
    sp.category,
    COALESCE(uit.score, 0) + (CASE WHEN public.is_store_featured(sp.id) THEN 50 ELSE 0 END) AS relevance_score,
    public.is_store_featured(sp.id) AS is_featured
  FROM store_profiles sp
  LEFT JOIN user_interest_tags uit ON uit.user_id = p_user_id AND uit.category = sp.category
  WHERE sp.is_active = true
  ORDER BY
    public.is_store_featured(sp.id) DESC,
    COALESCE(uit.score, 0) DESC,
    sp.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Referral wallet credit: award $0.50 (50 cents) to referrer on friend's first purchase
CREATE OR REPLACE FUNCTION public.credit_referral_wallet_bonus(
  p_referrer_id UUID,
  p_referee_id UUID,
  p_referral_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_credited BOOLEAN;
BEGIN
  -- Check if already credited for this referee
  SELECT EXISTS(
    SELECT 1 FROM customer_wallet_transactions
    WHERE user_id = p_referrer_id
    AND description ILIKE '%referral%'
    AND metadata->>'referee_id' = p_referee_id::text
  ) INTO v_already_credited;

  IF v_already_credited THEN RETURN FALSE; END IF;

  -- Credit $0.50 to referrer's wallet
  INSERT INTO customer_wallet_transactions (user_id, amount, type, description, metadata)
  VALUES (
    p_referrer_id,
    0.50,
    'credit',
    'Referral bonus: friend made first purchase',
    jsonb_build_object('referee_id', p_referee_id, 'referral_code', p_referral_code)
  );

  RETURN TRUE;
END;
$$;
