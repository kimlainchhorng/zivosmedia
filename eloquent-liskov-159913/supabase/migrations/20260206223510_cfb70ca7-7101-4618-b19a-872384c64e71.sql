-- Fix normalize_allowlist_email function to set search_path
CREATE OR REPLACE FUNCTION public.normalize_allowlist_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.email := LOWER(NEW.email);
  RETURN NEW;
END;
$function$;