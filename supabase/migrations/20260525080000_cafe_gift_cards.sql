-- Cafe gift cards — store-credit instruments that the cafe sells to one
-- customer and another (or the same) customer redeems against a ticket.
-- Balance is maintained by triggers so callers only need to:
--   • insert a row into cafe_gift_cards (initial_balance_cents) to issue
--   • insert into cafe_gift_card_redemptions to spend
--   • update cafe_gift_cards.is_active = false to disable
--
-- Codes are short, uppercase, alphanumeric and unique per store.

CREATE TABLE IF NOT EXISTS public.cafe_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  -- 12-char human-shareable code, e.g. KCUP-A7C4-9X2Q.
  code TEXT NOT NULL CHECK (char_length(code) BETWEEN 6 AND 32),

  initial_balance_cents INTEGER NOT NULL CHECK (initial_balance_cents > 0),
  balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),

  recipient_name TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  message TEXT CHECK (message IS NULL OR char_length(message) <= 500),

  issued_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cafe_gift_cards_store_code_unique
  ON public.cafe_gift_cards (store_id, upper(code));
CREATE INDEX IF NOT EXISTS cafe_gift_cards_store_created_idx
  ON public.cafe_gift_cards (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cafe_gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.cafe_gift_cards(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.cafe_orders(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  -- Positive amount redeemed; refunds are inserted as a separate row with a
  -- negative amount (so audit history is preserved).
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 300),
  taken_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_gift_card_redemptions_card_idx
  ON public.cafe_gift_card_redemptions (gift_card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_gift_card_redemptions_order_idx
  ON public.cafe_gift_card_redemptions (order_id) WHERE order_id IS NOT NULL;

DROP TRIGGER IF EXISTS cafe_gift_cards_set_updated_at ON public.cafe_gift_cards;
CREATE TRIGGER cafe_gift_cards_set_updated_at
  BEFORE UPDATE ON public.cafe_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- Seed `balance_cents` from `initial_balance_cents` on insert when not given.
CREATE OR REPLACE FUNCTION public.tg_cafe_gift_cards_init_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.balance_cents IS NULL OR NEW.balance_cents = 0 THEN
    NEW.balance_cents := NEW.initial_balance_cents;
  END IF;
  NEW.code := upper(NEW.code);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_gift_cards_init_balance ON public.cafe_gift_cards;
CREATE TRIGGER cafe_gift_cards_init_balance
  BEFORE INSERT ON public.cafe_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_gift_cards_init_balance();

-- Apply redemption (positive = spend, negative = reverse/refund) to balance.
-- Never let a redemption push balance below zero — that's the cashier's
-- signal that the card has insufficient funds.
CREATE OR REPLACE FUNCTION public.tg_cafe_gift_card_redemption_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
BEGIN
  SELECT id, balance_cents, is_active, expires_at INTO v_card
    FROM public.cafe_gift_cards
    WHERE id = NEW.gift_card_id
    FOR UPDATE;
  IF v_card.id IS NULL THEN
    RAISE EXCEPTION 'gift card not found';
  END IF;
  IF NEW.amount_cents > 0 AND v_card.is_active = false THEN
    RAISE EXCEPTION 'gift card is inactive';
  END IF;
  IF NEW.amount_cents > 0 AND v_card.expires_at IS NOT NULL AND v_card.expires_at < now() THEN
    RAISE EXCEPTION 'gift card has expired';
  END IF;
  IF NEW.amount_cents > v_card.balance_cents THEN
    RAISE EXCEPTION 'insufficient gift card balance';
  END IF;

  UPDATE public.cafe_gift_cards
    SET balance_cents = balance_cents - NEW.amount_cents,
        updated_at = now()
    WHERE id = NEW.gift_card_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_gift_card_redemption_apply ON public.cafe_gift_card_redemptions;
CREATE TRIGGER cafe_gift_card_redemption_apply
  BEFORE INSERT ON public.cafe_gift_card_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_gift_card_redemption_apply();

ALTER TABLE public.cafe_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_gift_card_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe gift cards - all"
  ON public.cafe_gift_cards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_gift_cards.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_gift_cards.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe gift card redemptions - all"
  ON public.cafe_gift_card_redemptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_gift_card_redemptions.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_gift_card_redemptions.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Public balance check by code so a customer can verify their card without
-- needing an account. Returns only balance + active state — no PII.
CREATE OR REPLACE FUNCTION public.cafe_gift_card_check_balance(p_store_id UUID, p_code TEXT)
RETURNS TABLE (balance_cents INTEGER, is_active BOOLEAN, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT gc.balance_cents, gc.is_active, gc.expires_at
  FROM public.cafe_gift_cards gc
  WHERE gc.store_id = p_store_id
    AND upper(gc.code) = upper(p_code);
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_gift_card_check_balance(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_gift_card_check_balance(UUID, TEXT) TO anon, authenticated;
