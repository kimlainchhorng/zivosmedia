-- Paid Direct Messages — unlock storage for locked DMs (image / video / text)
-- ---------------------------------------------------------------------------
-- direct_messages already has a locked_price_cents column. Group chat tracks
-- unlocks via a different mechanism; for 1:1 we need per-recipient unlock state.

CREATE TABLE IF NOT EXISTS public.direct_message_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  unlocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents_paid integer NOT NULL CHECK (amount_cents_paid >= 0),
  currency text NOT NULL DEFAULT 'usd',
  payment_provider text NOT NULL DEFAULT 'wallet',
  payment_ref text,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, unlocker_id)
);

CREATE INDEX IF NOT EXISTS dm_unlocks_unlocker_idx
  ON public.direct_message_unlocks(unlocker_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS dm_unlocks_creator_idx
  ON public.direct_message_unlocks(creator_id, unlocked_at DESC);

ALTER TABLE public.direct_message_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_unlocks_read_own" ON public.direct_message_unlocks;
CREATE POLICY "dm_unlocks_read_own" ON public.direct_message_unlocks
  FOR SELECT USING (auth.uid() = unlocker_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "dm_unlocks_insert_self" ON public.direct_message_unlocks;
CREATE POLICY "dm_unlocks_insert_self" ON public.direct_message_unlocks
  FOR INSERT WITH CHECK (auth.uid() = unlocker_id);
