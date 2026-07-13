-- Store training assignment mutations are owner/admin operations and must flow
-- through store-training-assignment-manage for program and employee scoping.

ALTER TABLE public.store_training_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can manage training assignments" ON public.store_training_assignments;

CREATE POLICY "Store training assignment inserts require trusted server-side validation"
  ON public.store_training_assignments
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store training assignment updates require trusted server-side validation"
  ON public.store_training_assignments
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store training assignment deletes require trusted server-side validation"
  ON public.store_training_assignments
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_assignments FROM authenticated;
GRANT SELECT ON TABLE public.store_training_assignments TO authenticated;
GRANT ALL ON TABLE public.store_training_assignments TO service_role;
