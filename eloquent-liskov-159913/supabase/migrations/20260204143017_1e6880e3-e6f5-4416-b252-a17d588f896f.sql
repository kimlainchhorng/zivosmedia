-- Fix security issue: account_deletion_requests table exposing sensitive privacy data
-- Users should only see their own requests, admins can see all

-- Ensure RLS is enabled
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Allow public insert" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Allow insert for all" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Allow select for all" ON public.account_deletion_requests;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
ON public.account_deletion_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can create their own deletion requests
CREATE POLICY "Users can create their own deletion requests"
ON public.account_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests (cancel), admins can update any
CREATE POLICY "Users can update their own deletion requests"
ON public.account_deletion_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Only admins can delete records
CREATE POLICY "Admins can delete deletion requests"
ON public.account_deletion_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));