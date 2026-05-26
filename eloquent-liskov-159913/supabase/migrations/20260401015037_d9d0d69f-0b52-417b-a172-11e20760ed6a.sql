-- 1. CHAT-ATTACHMENTS: Make bucket private and scope SELECT to specific chat membership
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- 2. CUSTOMER_FEEDBACK: Replace broad SELECT with scoped policy using existing safe view
DROP POLICY IF EXISTS "feedback_restricted" ON public.customer_feedback;

CREATE POLICY "feedback_owner_or_admin" ON public.customer_feedback
  FOR SELECT TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    OR is_admin(auth.uid())
  );