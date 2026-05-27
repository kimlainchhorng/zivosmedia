
-- Add share_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Generate share codes for existing profiles that don't have one
UPDATE public.profiles
SET share_code = substr(md5(id::text || random()::text), 1, 8)
WHERE share_code IS NULL;

-- Make share_code NOT NULL with default
ALTER TABLE public.profiles ALTER COLUMN share_code SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 8);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_share_code ON public.profiles(share_code);

-- Create a trigger to auto-generate share_code on insert
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := substr(md5(NEW.id::text || random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_share_code ON public.profiles;
CREATE TRIGGER trg_generate_share_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_share_code();
