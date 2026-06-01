-- General promotion writes now go through promotion-manage so owners/admins
-- are verified server-side before changing merchant promo codes.

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Merchants can manage own promotions" ON public.promotions;

CREATE POLICY "Promotions inserts require trusted server-side validation"
  ON public.promotions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Promotions updates require trusted server-side validation"
  ON public.promotions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Promotions deletes require trusted server-side validation"
  ON public.promotions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.promotions FROM authenticated;
GRANT SELECT ON TABLE public.promotions TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.promotions TO service_role;
