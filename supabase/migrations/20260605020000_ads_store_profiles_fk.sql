-- Align Marketing & Ads store ownership with the shared store_profiles table.
-- The ads subsystem was originally tied to restaurants, which blocks
-- auto-repair/software stores from connecting Meta, Google, TikTok, and X.

CREATE OR REPLACE FUNCTION public.user_owns_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_profiles
    WHERE id = _store_id
      AND owner_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_store(uuid, uuid) TO anon, authenticated, service_role;

ALTER TABLE public.store_ad_accounts
  DROP CONSTRAINT IF EXISTS store_ad_accounts_store_id_fkey,
  ADD CONSTRAINT store_ad_accounts_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.store_ad_campaigns
  DROP CONSTRAINT IF EXISTS store_ad_campaigns_store_id_fkey,
  ADD CONSTRAINT store_ad_campaigns_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.store_ad_pages
  DROP CONSTRAINT IF EXISTS store_ad_pages_store_id_fkey,
  ADD CONSTRAINT store_ad_pages_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.store_ad_platform_connections
  DROP CONSTRAINT IF EXISTS store_ad_platform_connections_store_id_fkey,
  ADD CONSTRAINT store_ad_platform_connections_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ads_studio_wallet
  DROP CONSTRAINT IF EXISTS ads_studio_wallet_store_id_fkey,
  ADD CONSTRAINT ads_studio_wallet_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ads_wallet_ledger
  DROP CONSTRAINT IF EXISTS ads_wallet_ledger_store_id_fkey,
  ADD CONSTRAINT ads_wallet_ledger_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.store_ad_audiences
  DROP CONSTRAINT IF EXISTS store_ad_audiences_store_id_fkey,
  ADD CONSTRAINT store_ad_audiences_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ad_platform_access_requests
  DROP CONSTRAINT IF EXISTS ad_platform_access_requests_store_id_fkey,
  ADD CONSTRAINT ad_platform_access_requests_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES public.store_profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Owner or admin manage ad accounts" ON public.store_ad_accounts;
CREATE POLICY "Owner or admin manage ad accounts"
  ON public.store_ad_accounts FOR ALL TO authenticated
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owner or admin manage ad campaigns" ON public.store_ad_campaigns;
CREATE POLICY "Owner or admin manage ad campaigns"
  ON public.store_ad_campaigns FOR ALL TO authenticated
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owner or admin manage ad pages" ON public.store_ad_pages;
CREATE POLICY "Owner or admin manage ad pages"
  ON public.store_ad_pages FOR ALL TO authenticated
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
