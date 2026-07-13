-- Ride ratings, lost item reports, and airport transfer requests are submitted
-- through ride-support-submit so user_id and payload shape are trusted.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_ride_support_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_ride_support_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_ride_support_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(category, 'general') NOT IN (
    'ride_rating',
    'lost_item_report',
    'transfer_request'
  )
);

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. ride support, marketing, product feedback, account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
