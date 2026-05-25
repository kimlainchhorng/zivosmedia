-- Persist tip payouts so each barista has a verifiable record of what they
-- earned. The header captures the window, mode, and total; line items
-- record what each barista got. Once a payout is committed it's frozen —
-- editing live distributions doesn't rewrite history.

CREATE TABLE IF NOT EXISTS public.cafe_tip_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  mode text NOT NULL CHECK (mode IN ('equal', 'by_hours', 'weighted')),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  paid_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cafe_tip_payout_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.cafe_tip_payouts(id) ON DELETE CASCADE,
  barista_id uuid NOT NULL REFERENCES public.cafe_baristas(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  minutes_worked integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 0,
  payout_cents integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS cafe_tip_payouts_store_idx
  ON public.cafe_tip_payouts(store_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS cafe_tip_payout_lines_payout_idx
  ON public.cafe_tip_payout_lines(payout_id);
CREATE INDEX IF NOT EXISTS cafe_tip_payout_lines_barista_idx
  ON public.cafe_tip_payout_lines(barista_id);

ALTER TABLE public.cafe_tip_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_tip_payout_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_tip_payouts_owner_manage ON public.cafe_tip_payouts;
CREATE POLICY cafe_tip_payouts_owner_manage ON public.cafe_tip_payouts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_tip_payouts.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_tip_payouts.store_id AND s.owner_id = auth.uid()));

-- Lines inherit ownership through the parent payout.
DROP POLICY IF EXISTS cafe_tip_payout_lines_owner_manage ON public.cafe_tip_payout_lines;
CREATE POLICY cafe_tip_payout_lines_owner_manage ON public.cafe_tip_payout_lines
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.cafe_tip_payouts p
    JOIN public.store_profiles s ON s.id = p.store_id
    WHERE p.id = cafe_tip_payout_lines.payout_id AND s.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cafe_tip_payouts p
    JOIN public.store_profiles s ON s.id = p.store_id
    WHERE p.id = cafe_tip_payout_lines.payout_id AND s.owner_id = auth.uid()
  ));
