-- Keep social saved-post writes behind the post-bookmark-manage Edge Function.
-- The service role bypasses RLS for trusted server-side writes. Browser
-- clients keep read access but cannot directly mutate post save records.

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_bookmarks_block_direct_insert ON public.post_bookmarks;
CREATE POLICY post_bookmarks_block_direct_insert
  ON public.post_bookmarks
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS post_bookmarks_block_direct_update ON public.post_bookmarks;
CREATE POLICY post_bookmarks_block_direct_update
  ON public.post_bookmarks
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS post_bookmarks_block_direct_delete ON public.post_bookmarks;
CREATE POLICY post_bookmarks_block_direct_delete
  ON public.post_bookmarks
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS bookmarks_block_direct_post_insert ON public.bookmarks;
CREATE POLICY bookmarks_block_direct_post_insert
  ON public.bookmarks
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (item_type <> 'post');

DROP POLICY IF EXISTS bookmarks_block_direct_post_update ON public.bookmarks;
CREATE POLICY bookmarks_block_direct_post_update
  ON public.bookmarks
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (item_type <> 'post')
  WITH CHECK (item_type <> 'post');

DROP POLICY IF EXISTS bookmarks_block_direct_post_delete ON public.bookmarks;
CREATE POLICY bookmarks_block_direct_post_delete
  ON public.bookmarks
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (item_type <> 'post');

COMMENT ON POLICY post_bookmarks_block_direct_insert ON public.post_bookmarks IS
  'Direct client saved-post writes are blocked; use post-bookmark-manage for trusted server-side ownership and validation.';
COMMENT ON POLICY post_bookmarks_block_direct_update ON public.post_bookmarks IS
  'Direct client saved-post writes are blocked; use post-bookmark-manage for trusted server-side ownership and validation.';
COMMENT ON POLICY post_bookmarks_block_direct_delete ON public.post_bookmarks IS
  'Direct client saved-post writes are blocked; use post-bookmark-manage for trusted server-side ownership and validation.';
COMMENT ON POLICY bookmarks_block_direct_post_insert ON public.bookmarks IS
  'Direct client social post bookmark writes are blocked; use post-bookmark-manage. Non-post bookmarks keep existing user-owned RLS.';
COMMENT ON POLICY bookmarks_block_direct_post_update ON public.bookmarks IS
  'Direct client social post bookmark writes are blocked; use post-bookmark-manage. Non-post bookmarks keep existing user-owned RLS.';
COMMENT ON POLICY bookmarks_block_direct_post_delete ON public.bookmarks IS
  'Direct client social post bookmark writes are blocked; use post-bookmark-manage. Non-post bookmarks keep existing user-owned RLS.';
