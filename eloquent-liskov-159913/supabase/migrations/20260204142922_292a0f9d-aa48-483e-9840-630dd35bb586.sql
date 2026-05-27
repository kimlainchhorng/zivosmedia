-- Fix security issue: abandoned_searches table exposing customer emails
-- This table should only be accessible by admins (for marketing automation)

-- First, ensure RLS is enabled (it should already be, but confirm)
ALTER TABLE public.abandoned_searches ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON public.abandoned_searches;
DROP POLICY IF EXISTS "Allow public insert" ON public.abandoned_searches;
DROP POLICY IF EXISTS "Allow insert for all" ON public.abandoned_searches;
DROP POLICY IF EXISTS "Allow select for all" ON public.abandoned_searches;

-- Create secure policies

-- Admins can view all abandoned searches (for analytics and marketing)
CREATE POLICY "Admins can view all abandoned searches"
ON public.abandoned_searches
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update abandoned searches (mark as emailed, etc.)
CREATE POLICY "Admins can update abandoned searches"
ON public.abandoned_searches
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete abandoned searches
CREATE POLICY "Admins can delete abandoned searches"
ON public.abandoned_searches
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to insert their own abandoned search records
-- This is needed for the trackAbandonedSearch function in emailAutomation.ts
CREATE POLICY "Authenticated users can insert abandoned searches"
ON public.abandoned_searches
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Service role (edge functions) can do everything - handled by Supabase automatically
-- The process-abandoned-searches edge function uses SUPABASE_SERVICE_ROLE_KEY