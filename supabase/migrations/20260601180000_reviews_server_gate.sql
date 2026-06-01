-- Generic review writes now go through review-manage so reviewer identity is
-- stamped from Auth and deletes are scoped server-side.

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reviews"
  ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews"
  ON public.reviews;
DROP POLICY IF EXISTS "Admins moderate reviews"
  ON public.reviews;

CREATE POLICY "Generic review inserts require trusted server-side validation"
  ON public.reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Generic review updates require trusted server-side validation"
  ON public.reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Generic review deletes require trusted server-side validation"
  ON public.reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.reviews TO service_role;
