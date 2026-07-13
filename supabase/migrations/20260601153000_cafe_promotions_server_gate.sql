-- Cafe promotion owner CRUD now goes through cafe-promotion-manage.
-- Checkout redemption RPCs remain responsible for trusted redemption counts.

ALTER TABLE public.cafe_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage cafe promotions - all"
  ON public.cafe_promotions;

CREATE POLICY "Cafe promotion inserts require trusted server-side validation"
  ON public.cafe_promotions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Cafe promotion updates require trusted server-side validation"
  ON public.cafe_promotions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Cafe promotion deletes require trusted server-side validation"
  ON public.cafe_promotions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.cafe_promotions FROM authenticated;
GRANT SELECT ON TABLE public.cafe_promotions TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.cafe_promotions TO service_role;
