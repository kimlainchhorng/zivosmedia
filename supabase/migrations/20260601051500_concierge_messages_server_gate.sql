-- Concierge handoff messages are account-linked support records. They must be
-- submitted through concierge-message-submit so user_id is trusted.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_concierge_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_concierge_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_concierge_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(category, 'general') <> 'concierge_message');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. concierge, travel support, shop ops, ride support, marketing, product feedback, account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
