-- Shop ops record cleanup now goes through shop-ops-record-manage so document
-- metadata and storage object paths are validated before deletion.

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_submissions_block_shop_ops_delete_direct ON public.feedback_submissions;
DROP POLICY IF EXISTS "feedback_submissions_block_shop_ops_delete_direct" ON public.feedback_submissions;

CREATE POLICY "feedback_submissions_block_shop_ops_delete_direct"
ON public.feedback_submissions
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (COALESCE(category, 'general') <> 'shop_document');

COMMENT ON TABLE public.feedback_submissions IS
  'General feedback and operational queues. shop ops create/delete, ride support, marketing, product feedback, account, legal, security, payment, support, and waitlist intake uses trusted server-side ingestion.';
