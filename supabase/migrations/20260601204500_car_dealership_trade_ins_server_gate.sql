-- Dealership trade-in appraisals are owner/admin records and must be mutated
-- only through a trusted Edge Function that validates store ownership and
-- linked sale/customer ownership.

ALTER TABLE public.car_dealership_trade_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_dealership_trade_ins - insert"
  ON public.car_dealership_trade_ins;
DROP POLICY IF EXISTS "Owners manage car_dealership_trade_ins - update"
  ON public.car_dealership_trade_ins;
DROP POLICY IF EXISTS "Owners manage car_dealership_trade_ins - delete"
  ON public.car_dealership_trade_ins;

CREATE POLICY "Car dealership trade-in inserts require trusted server-side validation"
  ON public.car_dealership_trade_ins
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car dealership trade-in updates require trusted server-side validation"
  ON public.car_dealership_trade_ins
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car dealership trade-in deletes require trusted server-side validation"
  ON public.car_dealership_trade_ins
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_dealership_trade_ins FROM authenticated;
GRANT SELECT ON TABLE public.car_dealership_trade_ins TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_dealership_trade_ins TO service_role;
