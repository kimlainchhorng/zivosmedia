-- Public marketing/newsletter/B2B lead capture uses marketing-interest-submit
-- so email and lead context are validated before feedback_submissions writes.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_marketing_interest_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_marketing_interest_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_marketing_interest_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(category, 'general') NOT IN (
    'newsletter_signup',
    'deals_alert_signup',
    'api_waitlist',
    'corporate_lead',
    'business_inquiry'
  )
);

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. marketing, product feedback, account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
