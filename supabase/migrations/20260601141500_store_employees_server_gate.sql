-- Store employee rows include staff identity, pay metadata, and account links.
-- Keep owner/employee/admin reads, but route all mutations through
-- store-employee-manage for trusted server-side authorization.

ALTER TABLE public.store_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can insert employees" ON public.store_employees;
DROP POLICY IF EXISTS "Store owners can update employees" ON public.store_employees;
DROP POLICY IF EXISTS "Store owners can delete employees" ON public.store_employees;
DROP POLICY IF EXISTS "Store employees inserts require trusted server-side validation" ON public.store_employees;
DROP POLICY IF EXISTS "Store employees updates require trusted server-side validation" ON public.store_employees;
DROP POLICY IF EXISTS "Store employees deletes require trusted server-side validation" ON public.store_employees;

CREATE POLICY "Store employees inserts require trusted server-side validation"
  ON public.store_employees
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store employees updates require trusted server-side validation"
  ON public.store_employees
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store employees deletes require trusted server-side validation"
  ON public.store_employees
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employees FROM authenticated;
GRANT SELECT ON TABLE public.store_employees TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_employees TO service_role;

COMMENT ON TABLE public.store_employees IS
  'Store staff records. Client reads are owner/employee/admin scoped; mutations are routed through store-employee-manage for trusted server-side validation.';
