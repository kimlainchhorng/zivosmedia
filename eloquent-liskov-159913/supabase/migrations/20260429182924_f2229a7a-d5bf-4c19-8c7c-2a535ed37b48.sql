-- Fix RLS policies for AutoRepair tables to check ownership via store_profiles instead of restaurants

DROP POLICY IF EXISTS "Owners manage their ar_estimates" ON public.ar_estimates;
DROP POLICY IF EXISTS "Owners manage their ar_invoices" ON public.ar_invoices;
DROP POLICY IF EXISTS "Owners manage their ar_invoice_payments" ON public.ar_invoice_payments;

CREATE POLICY "Store owners manage their ar_estimates"
ON public.ar_estimates FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.store_profiles sp
  WHERE sp.id = ar_estimates.store_id AND sp.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.store_profiles sp
  WHERE sp.id = ar_estimates.store_id AND sp.owner_id = auth.uid()
));

CREATE POLICY "Store owners manage their ar_invoices"
ON public.ar_invoices FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.store_profiles sp
  WHERE sp.id = ar_invoices.store_id AND sp.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.store_profiles sp
  WHERE sp.id = ar_invoices.store_id AND sp.owner_id = auth.uid()
));

CREATE POLICY "Store owners manage their ar_invoice_payments"
ON public.ar_invoice_payments FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.store_profiles sp
  WHERE sp.id = ar_invoice_payments.store_id AND sp.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.store_profiles sp
  WHERE sp.id = ar_invoice_payments.store_id AND sp.owner_id = auth.uid()
));