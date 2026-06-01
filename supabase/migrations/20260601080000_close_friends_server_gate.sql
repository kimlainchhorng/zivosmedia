-- Force close-friends add/remove through close-friend-manage so the server
-- owns user_id attribution and request validation for private story audiences.

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS close_friends_block_direct_insert ON public.close_friends;
DROP POLICY IF EXISTS close_friends_block_direct_delete ON public.close_friends;

CREATE POLICY close_friends_block_direct_insert
ON public.close_friends
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY close_friends_block_direct_delete
ON public.close_friends
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY close_friends_block_direct_insert ON public.close_friends
IS 'Blocks direct authenticated close-friend inserts; use close-friend-manage for trusted server-side ingestion.';

COMMENT ON POLICY close_friends_block_direct_delete ON public.close_friends
IS 'Blocks direct authenticated close-friend deletes; use close-friend-manage for trusted server-side ingestion.';
