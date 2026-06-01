-- Force legacy friendship lifecycle writes through friendship-manage so
-- request ownership, reciprocal follow behavior, and social push delivery are
-- trusted server-side decisions.

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friendships_block_direct_insert ON public.friendships;
DROP POLICY IF EXISTS friendships_block_direct_update ON public.friendships;
DROP POLICY IF EXISTS friendships_block_direct_delete ON public.friendships;

CREATE POLICY friendships_block_direct_insert
ON public.friendships
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY friendships_block_direct_update
ON public.friendships
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY friendships_block_direct_delete
ON public.friendships
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY friendships_block_direct_insert ON public.friendships
IS 'Blocks direct authenticated friendship inserts; use friendship-manage for trusted server-side ingestion.';

COMMENT ON POLICY friendships_block_direct_update ON public.friendships
IS 'Blocks direct authenticated friendship updates; use friendship-manage for trusted server-side ingestion.';

COMMENT ON POLICY friendships_block_direct_delete ON public.friendships
IS 'Blocks direct authenticated friendship deletes; use friendship-manage for trusted server-side ingestion.';
