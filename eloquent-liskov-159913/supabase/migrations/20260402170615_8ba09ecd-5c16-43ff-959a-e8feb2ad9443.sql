-- Add verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Only admins can update the is_verified field
-- (The existing update policy already restricts to own profile or admin,
--  so admins can already update any profile. No extra policy needed.)