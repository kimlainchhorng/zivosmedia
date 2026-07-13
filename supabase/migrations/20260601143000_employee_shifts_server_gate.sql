-- Employee schedules are operational data. Keep owner/employee/admin reads,
-- but route shift creation/deletion through employee-shift-manage.

ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can insert shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Store owners can update shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Store owners can delete shifts" ON public.employee_shifts;
DROP POLICY IF EXISTS "Employee shifts inserts require trusted server-side validation" ON public.employee_shifts;
DROP POLICY IF EXISTS "Employee shifts updates require trusted server-side validation" ON public.employee_shifts;
DROP POLICY IF EXISTS "Employee shifts deletes require trusted server-side validation" ON public.employee_shifts;

CREATE POLICY "Employee shifts inserts require trusted server-side validation"
  ON public.employee_shifts
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Employee shifts updates require trusted server-side validation"
  ON public.employee_shifts
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Employee shifts deletes require trusted server-side validation"
  ON public.employee_shifts
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_shifts FROM authenticated;
GRANT SELECT ON TABLE public.employee_shifts TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.employee_shifts TO service_role;

COMMENT ON TABLE public.employee_shifts IS
  'Employee schedule rows. Client reads are owner/employee/admin scoped; mutations are routed through employee-shift-manage for trusted server-side validation.';
