-- Update handle_new_user trigger to allow ALL signups (open registration)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create the profile for ANY new user (open signup)
  INSERT INTO public.profiles (id, user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Optionally mark allowlist entry as used if it exists (for tracking)
  UPDATE public.signup_allowlist
  SET used_at = NOW()
  WHERE email = LOWER(NEW.email) AND used_at IS NULL;
  
  RETURN NEW;
END;
$function$;