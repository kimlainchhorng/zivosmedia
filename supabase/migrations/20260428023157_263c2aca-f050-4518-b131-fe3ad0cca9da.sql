-- Owner-only RPC to read affiliate attribution without granting SELECT on
-- the affiliate columns to authenticated/anon (keeps referral chains private).
CREATE OR REPLACE FUNCTION public.get_my_affiliate_attribution()
RETURNS TABLE (
  affiliate_code text,
  affiliate_partner_name text,
  affiliate_captured_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT affiliate_code, affiliate_partner_name, affiliate_captured_at
  FROM public.profiles
  WHERE user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_affiliate_attribution() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_affiliate_attribution() TO authenticated;