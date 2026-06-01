-- Moderation appeals are submitted through moderation-appeal-submit so the
-- appealed action is verified against the authenticated user server-side.

ALTER TABLE public.appeal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appeal_requests_block_direct_insert ON public.appeal_requests;
DROP POLICY IF EXISTS "appeal_requests_block_direct_insert" ON public.appeal_requests;
CREATE POLICY "appeal_requests_block_direct_insert"
ON public.appeal_requests
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON TABLE public.appeal_requests IS
  'Moderation appeal requests; client inserts are blocked and trusted server-side ingestion is required.';
