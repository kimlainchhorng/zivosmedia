-- Legacy store_employee_rules mutations now go through employee-rule-manage
-- with rulebook='store_employee_rules' so store ownership/admin checks and
-- payload validation happen server-side.

ALTER TABLE public.store_employee_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can insert employee rules" ON public.store_employee_rules;
DROP POLICY IF EXISTS "Managers can update employee rules" ON public.store_employee_rules;
DROP POLICY IF EXISTS "Managers can delete employee rules" ON public.store_employee_rules;
DROP POLICY IF EXISTS "Store employee rules inserts require trusted server-side validation" ON public.store_employee_rules;
DROP POLICY IF EXISTS "Store employee rules updates require trusted server-side validation" ON public.store_employee_rules;
DROP POLICY IF EXISTS "Store employee rules deletes require trusted server-side validation" ON public.store_employee_rules;

CREATE POLICY "Store employee rules inserts require trusted server-side validation"
  ON public.store_employee_rules
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store employee rules updates require trusted server-side validation"
  ON public.store_employee_rules
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store employee rules deletes require trusted server-side validation"
  ON public.store_employee_rules
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employee_rules FROM authenticated;
GRANT SELECT ON TABLE public.store_employee_rules TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_employee_rules TO service_role;

COMMENT ON TABLE public.store_employee_rules IS
  'Legacy per-store employee rule book. Reads stay RLS scoped; mutations require trusted server-side employee-rule-manage validation.';
