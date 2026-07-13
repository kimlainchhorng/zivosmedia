-- Gate salon expense mutations through salon-expense-manage.

ALTER TABLE public.salon_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their expenses - all" ON public.salon_expenses;

DROP POLICY IF EXISTS "Owners read salon expenses" ON public.salon_expenses;
CREATE POLICY "Owners read salon expenses"
  ON public.salon_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_expenses.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon expense inserts require trusted server-side validation" ON public.salon_expenses;
CREATE POLICY "Salon expense inserts require trusted server-side validation"
  ON public.salon_expenses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon expense updates require trusted server-side validation" ON public.salon_expenses;
CREATE POLICY "Salon expense updates require trusted server-side validation"
  ON public.salon_expenses
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon expense deletes require trusted server-side validation" ON public.salon_expenses;
CREATE POLICY "Salon expense deletes require trusted server-side validation"
  ON public.salon_expenses
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_expenses FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_expenses TO authenticated;
GRANT ALL ON TABLE public.salon_expenses TO service_role;
