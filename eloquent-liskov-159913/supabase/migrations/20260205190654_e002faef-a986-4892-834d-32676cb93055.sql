-- Add setup_complete column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT false;

-- Update existing profiles to have setup_complete = true (they're already set up)
UPDATE public.profiles SET setup_complete = true WHERE setup_complete IS NULL;