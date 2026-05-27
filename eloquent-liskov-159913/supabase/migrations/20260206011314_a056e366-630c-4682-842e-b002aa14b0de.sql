-- Restore handle_new_user trigger with allowlist validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  allowlist_record RECORD;
BEGIN
  -- Check if email is on the allowlist
  SELECT id, used_at INTO allowlist_record
  FROM public.signup_allowlist
  WHERE email = LOWER(NEW.email);
  
  -- If not on allowlist, reject the signup
  IF allowlist_record IS NULL THEN
    RAISE EXCEPTION 'Email not authorized for signup: %', NEW.email;
  END IF;
  
  -- If invitation already used, reject
  IF allowlist_record.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already used for: %', NEW.email;
  END IF;
  
  -- Mark invitation as used
  UPDATE public.signup_allowlist
  SET used_at = NOW()
  WHERE id = allowlist_record.id;
  
  -- Create the profile
  INSERT INTO public.profiles (id, user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN NEW;
END;
$function$;