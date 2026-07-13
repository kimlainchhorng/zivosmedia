-- Story and direct-message safety reports are now written through
-- social-safety-report so identity, duplicate handling, and auto-blocking
-- happen in trusted server-side intake.

ALTER TABLE public.story_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS story_reports_block_direct_insert ON public.story_reports;
DROP POLICY IF EXISTS "story_reports_block_direct_insert" ON public.story_reports;
CREATE POLICY "story_reports_block_direct_insert"
ON public.story_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS story_comment_reports_block_direct_insert ON public.story_comment_reports;
DROP POLICY IF EXISTS "story_comment_reports_block_direct_insert" ON public.story_comment_reports;
CREATE POLICY "story_comment_reports_block_direct_insert"
ON public.story_comment_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS chat_message_reports_block_direct_insert ON public.chat_message_reports;
DROP POLICY IF EXISTS "chat_message_reports_block_direct_insert" ON public.chat_message_reports;
CREATE POLICY "chat_message_reports_block_direct_insert"
ON public.chat_message_reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON TABLE public.story_reports IS
  'Story safety reports; client inserts are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.story_comment_reports IS
  'Story comment safety reports; client inserts are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.chat_message_reports IS
  'Direct chat message reports; client inserts are blocked and trusted server-side ingestion is required.';
