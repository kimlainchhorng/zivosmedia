-- Store training programs/modules are owner-admin mutations and must flow
-- through store-training-program-manage for validation and auditability.

ALTER TABLE public.store_training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can create training programs" ON public.store_training_programs;
DROP POLICY IF EXISTS "Managers can update training programs" ON public.store_training_programs;
DROP POLICY IF EXISTS "Managers can delete training programs" ON public.store_training_programs;
DROP POLICY IF EXISTS "Managers can manage training modules" ON public.store_training_modules;

CREATE POLICY "Store training program inserts require trusted server-side validation"
  ON public.store_training_programs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store training program updates require trusted server-side validation"
  ON public.store_training_programs
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store training program deletes require trusted server-side validation"
  ON public.store_training_programs
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY "Store training module inserts require trusted server-side validation"
  ON public.store_training_modules
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store training module updates require trusted server-side validation"
  ON public.store_training_modules
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store training module deletes require trusted server-side validation"
  ON public.store_training_modules
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_programs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_modules FROM authenticated;
GRANT SELECT ON TABLE public.store_training_programs TO authenticated;
GRANT SELECT ON TABLE public.store_training_modules TO authenticated;
GRANT ALL ON TABLE public.store_training_programs TO service_role;
GRANT ALL ON TABLE public.store_training_modules TO service_role;
