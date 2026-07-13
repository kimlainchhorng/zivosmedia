-- Sensitive responsible-disclosure reports must enter through
-- security-report-submit so spoofed browser Data API writes cannot bury,
-- misclassify, or impersonate security_report submissions.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_security_report_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_security_report_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_security_report_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') <> 'security_report');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. security_report inserts use trusted server-side ingestion through security-report-submit.';
