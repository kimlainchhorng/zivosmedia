-- Admin ads/config queues are written through admin-feedback-queue-write so
-- admin role checks happen server-side before feedback_submissions is mutated.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_admin_queue_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_admin_queue_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_admin_queue_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(category, 'general') NOT IN (
    'admin_fb_config',
    'fb_scheduled_post',
    'google_ads_conversion_test'
  )
);

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. Admin ads/config writes and public/user intake use trusted server-side ingestion.';
