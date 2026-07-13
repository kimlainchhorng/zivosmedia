-- Legacy store promotion writes now go through store-promotion-manage.

ALTER TABLE public.store_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merged_all_authenticated"
  ON public.store_promotions;

CREATE POLICY "Store promotions owner/admin read"
  ON public.store_promotions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = store_promotions.store_id
        AND r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store promotion inserts require trusted server-side validation"
  ON public.store_promotions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store promotion updates require trusted server-side validation"
  ON public.store_promotions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store promotion deletes require trusted server-side validation"
  ON public.store_promotions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_promotions FROM authenticated;
GRANT SELECT ON TABLE public.store_promotions TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_promotions TO service_role;
