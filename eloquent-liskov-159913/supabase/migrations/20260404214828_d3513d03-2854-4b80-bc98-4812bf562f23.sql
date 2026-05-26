
CREATE OR REPLACE FUNCTION public.generate_cv_share_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;
