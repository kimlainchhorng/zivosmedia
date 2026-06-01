-- Product feedback forms submit through feedback-submit so category, contact,
-- rating, and optional user binding are validated consistently server-side.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_product_feedback_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_product_feedback_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_product_feedback_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(category, 'general') NOT IN (
    'rating',
    'price_mismatch',
    'suggestion',
    'bug',
    'feature',
    'praise',
    'ux'
  )
);

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. product feedback plus sensitive account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
