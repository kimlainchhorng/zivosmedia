-- Fix bus RLS policies: the single-arg public.is_store_owner(uuid) overload
-- checks the `restaurants` table, but bus operators are `store_profiles` rows,
-- so it was ALWAYS false for bus owners — silently blocking every owner write
-- (confirm/cancel bookings, add/cancel routes & trips; reads still worked via
-- the public status='active'/'scheduled' and customer_id = auth.uid() clauses).
-- Switch to the two-arg overload public.is_store_owner(store_id, auth.uid())
-- which checks store_profiles. Applied to the linked project via MCP 2026-06-01.

-- bus_routes
DROP POLICY IF EXISTS bus_routes_select ON public.bus_routes;
CREATE POLICY bus_routes_select ON public.bus_routes FOR SELECT
  USING (status = 'active' OR public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_routes_manage ON public.bus_routes;
CREATE POLICY bus_routes_manage ON public.bus_routes FOR ALL
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bus_trips
DROP POLICY IF EXISTS bus_trips_select ON public.bus_trips;
CREATE POLICY bus_trips_select ON public.bus_trips FOR SELECT
  USING (status = 'scheduled' OR public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_trips_manage ON public.bus_trips;
CREATE POLICY bus_trips_manage ON public.bus_trips FOR ALL
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bus_bookings
DROP POLICY IF EXISTS bus_bookings_select ON public.bus_bookings;
CREATE POLICY bus_bookings_select ON public.bus_bookings FOR SELECT
  USING (customer_id = auth.uid() OR public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_bookings_owner_update ON public.bus_bookings;
CREATE POLICY bus_bookings_owner_update ON public.bus_bookings FOR UPDATE
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));
