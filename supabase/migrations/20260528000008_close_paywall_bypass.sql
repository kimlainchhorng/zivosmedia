-- Close two paywall bypasses introduced by the PPV / Paid DM feature.
--
-- Vuln 1: ppv_unlocks_insert_self + dm_unlocks_insert_self granted INSERT
--         on the unlock tables to any authenticated user. The storage RLS
--         on ppv-media treated *any* ppv_unlocks row as proof of payment,
--         so the client could insert a 0-cent unlock row and immediately
--         download the locked media. Same shape for direct_message_unlocks.
--
-- Vuln 2: direct_messages.message held the plaintext for locked_text DMs.
--         The base SELECT RLS lets recipients read every column, so the
--         "pay to unlock" UI was a pure client-side gate any recipient
--         could skip with one REST query.
--
-- Fixes:
--   • Drop the public INSERT policies. The SECURITY DEFINER wallet RPCs
--     (unlock_ppv_with_wallet, unlock_dm_with_wallet) run as the function
--     owner and bypass RLS, so the legitimate flow is unaffected.
--   • Move the locked_text plaintext into a side-table whose SELECT RLS
--     requires either being the sender or having a matching row in
--     direct_message_unlocks.

-- ─── Vuln 1: drop public INSERT policies on the unlock tables ────────────────
DROP POLICY IF EXISTS "ppv_unlocks_insert_self"  ON public.ppv_unlocks;
DROP POLICY IF EXISTS "dm_unlocks_insert_self"   ON public.direct_message_unlocks;

-- ─── Vuln 2: side-table for locked_text plaintext ────────────────────────────
CREATE TABLE IF NOT EXISTS public.direct_message_locked_payloads (
  message_id uuid PRIMARY KEY REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_message_locked_payloads ENABLE ROW LEVEL SECURITY;

-- Sender always sees their own outgoing payload (so they remember what they
-- sent). Recipient sees it only after they've paid — i.e. there's a row in
-- direct_message_unlocks. Non-unlocker recipients get zero rows, so a REST
-- query for the content returns nothing.
DROP POLICY IF EXISTS "dm_locked_payloads_read" ON public.direct_message_locked_payloads;
CREATE POLICY "dm_locked_payloads_read"
  ON public.direct_message_locked_payloads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages m
       WHERE m.id = direct_message_locked_payloads.message_id
         AND m.sender_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.direct_message_unlocks u
       WHERE u.message_id = direct_message_locked_payloads.message_id
         AND u.unlocker_id = auth.uid()
    )
  );

-- Only the sender of a locked_text message can write its payload, and only
-- once (PRIMARY KEY on message_id prevents duplicates). UPDATE/DELETE are
-- intentionally omitted — payload is immutable; the DELETE CASCADE on
-- message_id handles cleanup when the parent message is deleted.
DROP POLICY IF EXISTS "dm_locked_payloads_insert" ON public.direct_message_locked_payloads;
CREATE POLICY "dm_locked_payloads_insert"
  ON public.direct_message_locked_payloads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.direct_messages m
       WHERE m.id = direct_message_locked_payloads.message_id
         AND m.sender_id = auth.uid()
         AND m.message_type = 'locked_text'
    )
  );

-- ─── Backfill any already-sent locked_text rows ──────────────────────────────
-- Move plaintext from direct_messages.message into the side-table for any
-- existing locked_text rows, then scrub the original column so a recipient
-- who never paid can no longer read it via base RLS.
INSERT INTO public.direct_message_locked_payloads (message_id, content, created_at)
SELECT m.id, m.message, m.created_at
  FROM public.direct_messages m
 WHERE m.message_type = 'locked_text'
   AND m.message IS NOT NULL
   AND m.message <> ''
ON CONFLICT (message_id) DO NOTHING;

UPDATE public.direct_messages
   SET message = ''
 WHERE message_type = 'locked_text'
   AND message IS NOT NULL
   AND message <> '';
