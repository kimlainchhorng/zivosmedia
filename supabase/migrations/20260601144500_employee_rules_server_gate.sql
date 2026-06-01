-- Workplace rules are policy records for a store team. Keep owner/team/admin
-- reads, but route rule mutations through employee-rule-manage.

ALTER TABLE public.employee_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can insert rules" ON public.employee_rules;
DROP POLICY IF EXISTS "Store owners can update rules" ON public.employee_rules;
DROP POLICY IF EXISTS "Store owners can delete rules" ON public.employee_rules;
DROP POLICY IF EXISTS "Employee rules inserts require trusted server-side validation" ON public.employee_rules;
DROP POLICY IF EXISTS "Employee rules updates require trusted server-side validation" ON public.employee_rules;
DROP POLICY IF EXISTS "Employee rules deletes require trusted server-side validation" ON public.employee_rules;

CREATE POLICY "Employee rules inserts require trusted server-side validation"
  ON public.employee_rules
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Employee rules updates require trusted server-side validation"
  ON public.employee_rules
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Employee rules deletes require trusted server-side validation"
  ON public.employee_rules
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_rules FROM authenticated;
GRANT SELECT ON TABLE public.employee_rules TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.employee_rules TO service_role;

COMMENT ON TABLE public.employee_rules IS
  'Store workplace rules. Client reads are owner/team/admin scoped; mutations are routed through employee-rule-manage for trusted server-side validation.';
