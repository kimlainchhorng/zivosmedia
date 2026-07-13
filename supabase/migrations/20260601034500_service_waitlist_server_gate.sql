-- Service waitlist signups are captured through service-waitlist-submit so
-- email/service payloads are validated and not silently dropped by browser code.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_service_waitlist_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_service_waitlist_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_service_waitlist_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') <> 'service_waitlist');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. sensitive account, legal, security, payment, support, and service waitlist intake uses trusted server-side ingestion.';
