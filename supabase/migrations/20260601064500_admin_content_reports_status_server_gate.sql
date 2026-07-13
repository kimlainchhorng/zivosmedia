-- Admin content report status changes are written through
-- admin-content-report-status so review state changes are tied to a verified
-- admin session server-side.

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reports_block_direct_update ON public.content_reports;
DROP POLICY IF EXISTS "content_reports_block_direct_update" ON public.content_reports;
CREATE POLICY "content_reports_block_direct_update"
ON public.content_reports
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.content_reports IS
  'Creator and paid-content reports; client writes are blocked and trusted server-side ingestion is required.';
