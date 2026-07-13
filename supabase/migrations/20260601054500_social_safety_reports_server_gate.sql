-- Social safety report rows are created through social-safety-report so
-- reporter identity, duplicate handling, and optional auto-blocking are
-- enforced by one trusted server-side intake.

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_reports_block_direct_insert ON public.post_reports;
DROP POLICY IF EXISTS "post_reports_block_direct_insert" ON public.post_reports;
CREATE POLICY "post_reports_block_direct_insert"
ON public.post_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS comment_reports_block_direct_insert ON public.comment_reports;
DROP POLICY IF EXISTS "comment_reports_block_direct_insert" ON public.comment_reports;
CREATE POLICY "comment_reports_block_direct_insert"
ON public.comment_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS content_reports_block_direct_insert ON public.content_reports;
DROP POLICY IF EXISTS "content_reports_block_direct_insert" ON public.content_reports;
CREATE POLICY "content_reports_block_direct_insert"
ON public.content_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS group_message_reports_block_direct_insert ON public.group_message_reports;
DROP POLICY IF EXISTS "group_message_reports_block_direct_insert" ON public.group_message_reports;
CREATE POLICY "group_message_reports_block_direct_insert"
ON public.group_message_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON TABLE public.post_reports IS
  'Social post reports; client inserts are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.comment_reports IS
  'Social comment reports; client inserts are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.content_reports IS
  'Creator and paid-content reports; client inserts are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.group_message_reports IS
  'Group message reports; client inserts are blocked and trusted server-side ingestion is required.';
