-- Add RLS policies for voice_rooms and voice_room_participants.
--
-- Same shape as the Jobs gap closed in 20260528000012: both tables had
-- ENABLE ROW LEVEL SECURITY in 20260505210000 and grants to authenticated
-- in 20260522012300, but no CREATE POLICY anywhere. Postgres default-deny
-- means every authenticated query returns zero rows. The Voice rooms /
-- Spaces feature shipped in commit 9e26d4dd4 only works in environments
-- where someone hand-configured policies via the Supabase dashboard.
--
-- Policy shape:
--
--   voice_rooms:
--     • Anyone authenticated can read LIVE rooms (is_live=true). Ended
--       rooms stay visible to the host so they can see their history.
--     • Hosts create / update / delete their own rooms, scoped by
--       auth.uid() = host_id on every mutation.
--
--   voice_room_participants:
--     • Anyone authenticated can SELECT — participant lists are public on
--       the room view (matches Twitter Spaces / Clubhouse where anyone in
--       the room sees the speaker / listener list).
--     • A user can INSERT their own participant row (auth.uid() = user_id)
--       to join a room. Role defaults to 'listener'; promotion to
--       speaker / co_host requires the host (UPDATE policy below).
--     • A user can UPDATE their own row (e.g. toggle is_muted). The host
--       can also UPDATE any participant row in their room (kick to
--       listener, promote to speaker / co_host). WITH CHECK pins user_id
--       and room_id so neither side can transfer rows around.
--     • A user can DELETE their own row (leave the room). The host can
--       DELETE any participant row in their room (kick).

-- ─── voice_rooms ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "voice_rooms_read" ON public.voice_rooms;
CREATE POLICY "voice_rooms_read"
  ON public.voice_rooms
  FOR SELECT
  TO authenticated
  USING (
    is_live = true
    OR auth.uid() = host_id
  );

DROP POLICY IF EXISTS "voice_rooms_insert_own" ON public.voice_rooms;
CREATE POLICY "voice_rooms_insert_own"
  ON public.voice_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "voice_rooms_update_own" ON public.voice_rooms;
CREATE POLICY "voice_rooms_update_own"
  ON public.voice_rooms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "voice_rooms_delete_own" ON public.voice_rooms;
CREATE POLICY "voice_rooms_delete_own"
  ON public.voice_rooms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- ─── voice_room_participants ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "voice_room_participants_read" ON public.voice_room_participants;
CREATE POLICY "voice_room_participants_read"
  ON public.voice_room_participants
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "voice_room_participants_insert_own" ON public.voice_room_participants;
CREATE POLICY "voice_room_participants_insert_own"
  ON public.voice_room_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_room_participants_update_self" ON public.voice_room_participants;
CREATE POLICY "voice_room_participants_update_self"
  ON public.voice_room_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_room_participants_update_host" ON public.voice_room_participants;
CREATE POLICY "voice_room_participants_update_host"
  ON public.voice_room_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_rooms r
       WHERE r.id = voice_room_participants.room_id
         AND r.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voice_rooms r
       WHERE r.id = voice_room_participants.room_id
         AND r.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "voice_room_participants_delete_self" ON public.voice_room_participants;
CREATE POLICY "voice_room_participants_delete_self"
  ON public.voice_room_participants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_room_participants_delete_host" ON public.voice_room_participants;
CREATE POLICY "voice_room_participants_delete_host"
  ON public.voice_room_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_rooms r
       WHERE r.id = voice_room_participants.room_id
         AND r.host_id = auth.uid()
    )
  );
