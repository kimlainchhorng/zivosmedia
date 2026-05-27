-- Fix profiles table RLS policies to prevent data exposure
-- The issue: Multiple conflicting SELECT policies with wrong column references (id vs user_id)

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_final_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_final_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_final_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_only_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create clean, secure policies
-- Users can only SELECT their own profile (via user_id), admins can see all
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin')
);

-- Users can INSERT their own profile only
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own profile only
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only admins can DELETE profiles
CREATE POLICY "profiles_delete_admin_only"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));