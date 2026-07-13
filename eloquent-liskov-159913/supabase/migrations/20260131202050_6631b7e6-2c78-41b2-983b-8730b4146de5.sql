-- Fix permissive RLS policy on customer_feedback INSERT
-- The current policy allows anyone to insert feedback (WITH CHECK (true))
-- We should require at least an authenticated user

DROP POLICY IF EXISTS "customer_feedback_insert" ON public.customer_feedback;
CREATE POLICY "customer_feedback_insert" ON public.customer_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);