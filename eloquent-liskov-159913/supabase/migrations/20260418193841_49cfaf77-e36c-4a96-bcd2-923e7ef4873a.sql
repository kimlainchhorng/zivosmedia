ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ADD COLUMN IF NOT EXISTS discount_months integer DEFAULT 0 CHECK (discount_months >= 0 AND discount_months <= 24),
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS badge_color text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS badge_emoji text;

CREATE TABLE IF NOT EXISTS public.creator_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  code text NOT NULL,
  percent_off integer NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, code)
);

ALTER TABLE public.creator_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage own promo codes" ON public.creator_promo_codes;
CREATE POLICY "Creators manage own promo codes"
  ON public.creator_promo_codes FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.creator_promo_codes;
CREATE POLICY "Anyone can view active promo codes"
  ON public.creator_promo_codes FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_creator_promo_codes_creator ON public.creator_promo_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_promo_codes_code ON public.creator_promo_codes(code);