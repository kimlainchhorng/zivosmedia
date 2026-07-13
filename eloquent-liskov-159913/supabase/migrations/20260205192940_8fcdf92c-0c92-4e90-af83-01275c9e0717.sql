-- Create signup_allowlist table for invite-only registration
CREATE TABLE IF NOT EXISTS public.signup_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- Normalize email to lowercase
CREATE OR REPLACE FUNCTION public.normalize_allowlist_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email := LOWER(NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_allowlist_email_trigger
BEFORE INSERT OR UPDATE ON public.signup_allowlist
FOR EACH ROW EXECUTE FUNCTION public.normalize_allowlist_email();

-- Enable Row Level Security
ALTER TABLE public.signup_allowlist ENABLE ROW LEVEL SECURITY;

-- Only admins can manage allowlist
CREATE POLICY "Admins can manage allowlist"
ON public.signup_allowlist
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user trigger to validate allowlist and mark as used
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email is on allowlist
  IF NOT EXISTS (SELECT 1 FROM public.signup_allowlist WHERE email = LOWER(NEW.email)) THEN
    RAISE EXCEPTION 'Email not on allowlist: %', NEW.email;
  END IF;
  
  -- Mark allowlist entry as used
  UPDATE public.signup_allowlist SET used_at = now() WHERE email = LOWER(NEW.email);
  
  -- Create profile with setup_complete = false
  INSERT INTO public.profiles (user_id, email, setup_complete)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();