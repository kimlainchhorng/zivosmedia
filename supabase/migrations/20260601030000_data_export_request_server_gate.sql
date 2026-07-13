-- Legacy account-security export requests used feedback_submissions directly.
-- Keep that sensitive category server-only; current UI records exports through
-- privacy-request-submit as a DSAR download request.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_data_export_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_data_export_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_data_export_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') <> 'data_export_request');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. security_report, dsar_request, consent_change, and data_export_request intake uses trusted server-side ingestion.';
