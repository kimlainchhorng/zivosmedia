-- Payroll formulas affect money movement calculations and must be written
-- through store-payroll-config-update for owner/admin validation.

ALTER TABLE IF EXISTS public.store_payroll_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can upsert payroll configs" ON public.store_payroll_configs;
DROP POLICY IF EXISTS "Store owners can update payroll configs" ON public.store_payroll_configs;

CREATE POLICY "Store payroll config inserts require trusted server-side validation"
  ON public.store_payroll_configs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store payroll config updates require trusted server-side validation"
  ON public.store_payroll_configs
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payroll_configs FROM authenticated;
GRANT SELECT ON TABLE public.store_payroll_configs TO authenticated;
GRANT ALL ON TABLE public.store_payroll_configs TO service_role;
