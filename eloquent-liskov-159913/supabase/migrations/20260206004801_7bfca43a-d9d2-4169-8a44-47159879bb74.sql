-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Update existing profiles to set user_id from id if needed (for backwards compatibility)
UPDATE public.profiles 
SET user_id = id 
WHERE user_id IS NULL AND id IS NOT NULL;

-- Add unique constraint on user_id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);