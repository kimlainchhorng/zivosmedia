-- Refund support requests are payment-adjacent records. They must be submitted
-- through refund-request-submit so user_id and transaction context are trusted.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_refund_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_refund_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_refund_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') <> 'refund_request');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. security_report, dsar_request, consent_change, data_export_request, and refund_request intake uses trusted server-side ingestion.';
