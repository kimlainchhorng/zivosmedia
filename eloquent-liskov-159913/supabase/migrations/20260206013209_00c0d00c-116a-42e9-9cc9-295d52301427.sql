-- Add email_verified column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Update existing verified users (those with email_confirmed_at in auth.users)
-- This will be handled in the application layer since we can't access auth.users directly here