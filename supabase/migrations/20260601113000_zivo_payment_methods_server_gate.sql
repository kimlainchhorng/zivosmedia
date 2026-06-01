-- Force saved ZIVO payment method mutations through zivo-payment-method-manage.
-- Reads remain user-scoped through existing RLS policies; setup/webhook flows use service role.

ALTER TABLE public.zivo_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zivo_payment_methods_block_direct_insert ON public.zivo_payment_methods;
DROP POLICY IF EXISTS "zivo_payment_methods_block_direct_insert" ON public.zivo_payment_methods;
CREATE POLICY "zivo_payment_methods_block_direct_insert"
ON public.zivo_payment_methods
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS zivo_payment_methods_block_direct_update ON public.zivo_payment_methods;
DROP POLICY IF EXISTS "zivo_payment_methods_block_direct_update" ON public.zivo_payment_methods;
CREATE POLICY "zivo_payment_methods_block_direct_update"
ON public.zivo_payment_methods
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS zivo_payment_methods_block_direct_delete ON public.zivo_payment_methods;
DROP POLICY IF EXISTS "zivo_payment_methods_block_direct_delete" ON public.zivo_payment_methods;
CREATE POLICY "zivo_payment_methods_block_direct_delete"
ON public.zivo_payment_methods
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.zivo_payment_methods IS
'Saved payment method mutations are routed through zivo-payment-method-manage for trusted server-side ownership validation.';
