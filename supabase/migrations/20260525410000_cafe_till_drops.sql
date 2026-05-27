-- cafe_till_drops: cash removed from the drawer mid-shift (deposited to a
-- safe, bank drop, etc.). Reduces the expected cash at close of shift —
-- otherwise the variance would mis-blame staff for the missing amount.

CREATE TABLE IF NOT EXISTS public.cafe_till_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  till_session_id uuid NOT NULL REFERENCES public.cafe_till_sessions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  note text,
  dropped_at timestamptz NOT NULL DEFAULT now(),
  dropped_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_till_drops_session_idx
  ON public.cafe_till_drops(till_session_id, dropped_at DESC);

ALTER TABLE public.cafe_till_drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_till_drops_owner_manage ON public.cafe_till_drops;
CREATE POLICY cafe_till_drops_owner_manage ON public.cafe_till_drops
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = cafe_till_drops.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = cafe_till_drops.store_id AND s.owner_id = auth.uid()
    )
  );
