-- Force loyalty balance mutations through loyalty-points-manage.
-- Reads remain user-scoped; service-role functions perform trusted server-side point accounting.

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Users can update own loyalty points" ON public.loyalty_points;

DROP POLICY IF EXISTS loyalty_points_block_direct_insert ON public.loyalty_points;
DROP POLICY IF EXISTS "loyalty_points_block_direct_insert" ON public.loyalty_points;
CREATE POLICY "loyalty_points_block_direct_insert"
ON public.loyalty_points
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS loyalty_points_block_direct_update ON public.loyalty_points;
DROP POLICY IF EXISTS "loyalty_points_block_direct_update" ON public.loyalty_points;
CREATE POLICY "loyalty_points_block_direct_update"
ON public.loyalty_points
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS loyalty_points_block_direct_delete ON public.loyalty_points;
DROP POLICY IF EXISTS "loyalty_points_block_direct_delete" ON public.loyalty_points;
CREATE POLICY "loyalty_points_block_direct_delete"
ON public.loyalty_points
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.loyalty_points IS
'Loyalty balances are mutated by loyalty-points-manage for trusted server-side point accounting.';
