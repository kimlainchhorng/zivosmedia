-- Drop any existing overly permissive policies on travelers
DROP POLICY IF EXISTS "Enable read access for all users" ON public.travelers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.travelers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.travelers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.travelers;
DROP POLICY IF EXISTS "Anyone can view travelers" ON public.travelers;
DROP POLICY IF EXISTS "Anyone can insert travelers" ON public.travelers;
DROP POLICY IF EXISTS "Anyone can update travelers" ON public.travelers;
DROP POLICY IF EXISTS "Users can view own travelers" ON public.travelers;
DROP POLICY IF EXISTS "Users can insert own travelers" ON public.travelers;
DROP POLICY IF EXISTS "Users can update own travelers" ON public.travelers;
DROP POLICY IF EXISTS "Users can delete own travelers" ON public.travelers;
DROP POLICY IF EXISTS "Admins can view all travelers" ON public.travelers;

-- Ensure RLS is enabled
ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;

-- Users can only view their own travelers (linked via user_id)
CREATE POLICY "Users can view own travelers"
ON public.travelers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own travelers
CREATE POLICY "Users can insert own travelers"
ON public.travelers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own travelers
CREATE POLICY "Users can update own travelers"
ON public.travelers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own travelers
CREATE POLICY "Users can delete own travelers"
ON public.travelers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all travelers for support purposes
CREATE POLICY "Admins can view all travelers"
ON public.travelers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update travelers for support purposes
CREATE POLICY "Admins can update all travelers"
ON public.travelers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));