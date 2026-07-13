-- Fix profiles table to support safe upserts
-- 1) Ensure id has a default
ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2) Backfill any existing NULL ids (should not happen, but observed)
UPDATE public.profiles
SET id = gen_random_uuid()
WHERE id IS NULL;

-- 3) Ensure one profile per auth user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;
