-- Shop ops metadata and digital product review requests are created through
-- shop-ops-record-submit so user_id and JSON payloads are trusted.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_shop_ops_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_shop_ops_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_shop_ops_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(category, 'general') NOT IN (
    'shop_document',
    'shop_training',
    'digital_product'
  )
);

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. shop ops, ride support, marketing, product feedback, account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
