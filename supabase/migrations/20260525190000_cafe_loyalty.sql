-- Cafe loyalty — one program per cafe (config), one balance per customer,
-- and an events log. Triggers keep the balance in sync.
--
-- Mode: 'points_per_dollar' (earn N points per cent spent, redeem when
-- threshold reached) or 'stamp_card' (one stamp per qualifying purchase,
-- N stamps = free reward).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_loyalty_mode') THEN
    CREATE TYPE public.cafe_loyalty_mode AS ENUM ('points_per_dollar', 'stamp_card');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_loyalty_event_kind') THEN
    CREATE TYPE public.cafe_loyalty_event_kind AS ENUM ('earn', 'redeem', 'adjust', 'expire');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  mode public.cafe_loyalty_mode NOT NULL DEFAULT 'points_per_dollar',
  -- points_per_dollar: thousandths of a point per cent (so 1.0 = 100 per $1).
  -- stamp_card: ignored (always 1).
  earn_rate_milli NUMERIC(8,3) NOT NULL DEFAULT 1.000 CHECK (earn_rate_milli >= 0),
  redeem_threshold INTEGER NOT NULL DEFAULT 100 CHECK (redeem_threshold > 0),
  reward_value_cents INTEGER NOT NULL DEFAULT 100 CHECK (reward_value_cents > 0),

  -- Birthday bonus, referral bonus etc. all-or-nothing flags.
  birthday_bonus_points INTEGER NOT NULL DEFAULT 0 CHECK (birthday_bonus_points >= 0),
  referral_bonus_points INTEGER NOT NULL DEFAULT 0 CHECK (referral_bonus_points >= 0),

  -- Points expire after N days of inactivity. NULL = never.
  expire_after_days INTEGER CHECK (expire_after_days IS NULL OR expire_after_days > 0),

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cafe_loyalty_programs_store_unique
  ON public.cafe_loyalty_programs (store_id);

DROP TRIGGER IF EXISTS cafe_loyalty_programs_set_updated_at ON public.cafe_loyalty_programs;
CREATE TRIGGER cafe_loyalty_programs_set_updated_at
  BEFORE UPDATE ON public.cafe_loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

CREATE TABLE IF NOT EXISTS public.cafe_loyalty_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  -- Identity: phone is the primary key for guest customers; user_id when
  -- a signed-in customer earned the points.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  display_name TEXT,

  -- Current balance, updated by the event trigger.
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (total_redeemed >= 0),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cafe_loyalty_balances_has_id CHECK (user_id IS NOT NULL OR phone IS NOT NULL),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cafe_loyalty_balances_store_phone_unique
  ON public.cafe_loyalty_balances (store_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cafe_loyalty_balances_store_user_unique
  ON public.cafe_loyalty_balances (store_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cafe_loyalty_balances_store_idx
  ON public.cafe_loyalty_balances (store_id, points DESC);

DROP TRIGGER IF EXISTS cafe_loyalty_balances_set_updated_at ON public.cafe_loyalty_balances;
CREATE TRIGGER cafe_loyalty_balances_set_updated_at
  BEFORE UPDATE ON public.cafe_loyalty_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

CREATE TABLE IF NOT EXISTS public.cafe_loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES public.cafe_loyalty_balances(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.cafe_orders(id) ON DELETE SET NULL,

  kind public.cafe_loyalty_event_kind NOT NULL,
  -- Positive for earn / negative for redeem. adjust can be either way.
  points_change INTEGER NOT NULL CHECK (points_change <> 0),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 300),

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_loyalty_events_store_idx
  ON public.cafe_loyalty_events (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_loyalty_events_balance_idx
  ON public.cafe_loyalty_events (balance_id, created_at DESC);

-- Apply event → balance.
CREATE OR REPLACE FUNCTION public.tg_cafe_loyalty_event_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
BEGIN
  SELECT id, points INTO v_balance
    FROM public.cafe_loyalty_balances
    WHERE id = NEW.balance_id
    FOR UPDATE;
  IF v_balance.id IS NULL THEN
    RAISE EXCEPTION 'loyalty balance not found';
  END IF;
  IF NEW.points_change < 0 AND v_balance.points + NEW.points_change < 0 THEN
    RAISE EXCEPTION 'insufficient points (have %, requested %)', v_balance.points, NEW.points_change;
  END IF;
  UPDATE public.cafe_loyalty_balances
    SET points = points + NEW.points_change,
        total_earned = total_earned + GREATEST(NEW.points_change, 0),
        total_redeemed = total_redeemed + GREATEST(-NEW.points_change, 0),
        last_activity_at = now(),
        updated_at = now()
    WHERE id = NEW.balance_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_loyalty_event_apply ON public.cafe_loyalty_events;
CREATE TRIGGER cafe_loyalty_event_apply
  BEFORE INSERT ON public.cafe_loyalty_events
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_loyalty_event_apply();

ALTER TABLE public.cafe_loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_loyalty_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_loyalty_events ENABLE ROW LEVEL SECURITY;

-- Public reads the program (so storefront can show "earn 10 points per $1").
CREATE POLICY "Public reads active loyalty program"
  ON public.cafe_loyalty_programs
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_programs.store_id AND sp.is_active = true)
  );

CREATE POLICY "Owners manage loyalty program - all"
  ON public.cafe_loyalty_programs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_programs.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_programs.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage loyalty balances - all"
  ON public.cafe_loyalty_balances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_balances.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_balances.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Customers read their own loyalty balance"
  ON public.cafe_loyalty_balances
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Owners manage loyalty events - all"
  ON public.cafe_loyalty_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_events.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_loyalty_events.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
