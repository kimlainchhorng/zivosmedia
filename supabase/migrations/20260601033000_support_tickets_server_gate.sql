-- Customer support tickets are account-linked records. They must be submitted
-- through support-ticket-submit so user_id and email context are trusted.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_support_ticket_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_support_ticket_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_support_ticket_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') <> 'support_ticket');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. sensitive account, legal, security, payment, and support intake uses trusted server-side ingestion.';
