-- Gate salon client mutations through salon-client-manage.
-- Owner/admin client-book CRUD and authenticated customer preference updates
-- both use the Edge Function; direct table writes are revoked.

ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their clients - insert" ON public.salon_clients;
DROP POLICY IF EXISTS "Owners manage their clients - update" ON public.salon_clients;
DROP POLICY IF EXISTS "Owners manage their clients - delete" ON public.salon_clients;
DROP POLICY IF EXISTS "Clients update their own preferences" ON public.salon_clients;

DROP POLICY IF EXISTS "Salon client inserts require trusted server-side validation" ON public.salon_clients;
CREATE POLICY "Salon client inserts require trusted server-side validation"
  ON public.salon_clients
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon client updates require trusted server-side validation" ON public.salon_clients;
CREATE POLICY "Salon client updates require trusted server-side validation"
  ON public.salon_clients
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon client deletes require trusted server-side validation" ON public.salon_clients;
CREATE POLICY "Salon client deletes require trusted server-side validation"
  ON public.salon_clients
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_clients FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_clients TO authenticated;
GRANT ALL ON TABLE public.salon_clients TO service_role;
