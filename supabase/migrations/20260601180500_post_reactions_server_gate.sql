-- Keep Feed/Reels post reaction writes behind the post-reaction-manage Edge Function.
-- The service role bypasses RLS for trusted server-side writes; authenticated
-- browser clients keep read access but cannot directly insert/update/delete.

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_reactions_block_direct_insert ON public.post_reactions;
CREATE POLICY post_reactions_block_direct_insert
  ON public.post_reactions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS post_reactions_block_direct_update ON public.post_reactions;
CREATE POLICY post_reactions_block_direct_update
  ON public.post_reactions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS post_reactions_block_direct_delete ON public.post_reactions;
CREATE POLICY post_reactions_block_direct_delete
  ON public.post_reactions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON POLICY post_reactions_block_direct_insert ON public.post_reactions IS
  'Direct client reaction writes are blocked; use post-reaction-manage for trusted server-side ownership and validation.';
COMMENT ON POLICY post_reactions_block_direct_update ON public.post_reactions IS
  'Direct client reaction writes are blocked; use post-reaction-manage for trusted server-side ownership and validation.';
COMMENT ON POLICY post_reactions_block_direct_delete ON public.post_reactions IS
  'Direct client reaction writes are blocked; use post-reaction-manage for trusted server-side ownership and validation.';
