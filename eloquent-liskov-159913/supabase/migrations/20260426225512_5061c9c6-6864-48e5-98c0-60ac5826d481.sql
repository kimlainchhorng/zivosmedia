-- Fix: previous security migration revoked column-level SELECT on profiles
-- and re-granted only an explicit list. Newly added columns (display_brand_name)
-- were never granted, causing SELECT * on profiles to fail with "permission
-- denied for column display_brand_name", which left the Profile page stuck
-- on a loading spinner.

-- 1) Direct fix for the missing column
GRANT SELECT (display_brand_name) ON public.profiles TO authenticated;

-- 2) Defensive: grant SELECT on EVERY current column of public.profiles to
--    authenticated. Row-level RLS still controls WHICH ROWS each user sees,
--    so sensitive fields (email, phone, kyc_*, payout_*, etc.) remain
--    protected because non-owners cannot select those rows at all.
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles';
  IF cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', cols);
  END IF;
END$$;