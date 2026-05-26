-- Fix RLS policy for redirect logs - allow authenticated users to insert their own logs
DROP POLICY IF EXISTS "Authenticated can insert redirect logs" ON public.partner_redirect_logs;

CREATE POLICY "Authenticated can insert redirect logs"
ON public.partner_redirect_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);