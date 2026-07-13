-- Travel/staff support queue records use travel-support-submit so user binding
-- and JSON payloads are trusted server-side.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_travel_support_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_travel_support_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_travel_support_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(category, 'general') NOT IN (
    'time_off_request',
    'shift_swap_request',
    'flight_companion'
  )
);

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. travel support, shop ops, ride support, marketing, product feedback, account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
