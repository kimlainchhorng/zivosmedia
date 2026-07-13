-- DSAR and consent-change feedback rows are legal/privacy records. They must be
-- created through privacy-request-submit so user_id and schema shape are trusted.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_privacy_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_privacy_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_privacy_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') NOT IN ('dsar_request', 'consent_change'));

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. security_report, dsar_request, and consent_change inserts use trusted server-side ingestion.';
