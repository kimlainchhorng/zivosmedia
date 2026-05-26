-- ============================================================
-- Phase 2A — Security Hardening (FINAL)
-- ============================================================

-- 1. Move pg_trgm out of public
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, authenticated, anon, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 2. RLS-no-policy tables → service_role only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_private_settings','email_send_log','email_send_state',
    'email_unsubscribe_tokens','oauth_state_nonces','suppressed_emails'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role_all', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (false)',
      t || '_authenticated_deny', t
    );
  END LOOP;
END $$;

-- 3. Always-true policies → service_role
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname='public'
      AND cmd IN ('UPDATE','DELETE','INSERT')
      AND (qual='true' OR with_check='true')
      AND 'public' = ANY(roles)
      AND tablename NOT IN ('lodge_amenity_feedback','map_pin_clicks','service_bookings')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF r.cmd='INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO service_role WITH CHECK (true)', r.policyname, r.schemaname, r.tablename);
    ELSIF r.cmd='UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO service_role USING (true) WITH CHECK (true)', r.policyname, r.schemaname, r.tablename);
    ELSIF r.cmd='DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO service_role USING (true)', r.policyname, r.schemaname, r.tablename);
    END IF;
  END LOOP;
END $$;

-- Public-submission INSERT
DROP POLICY IF EXISTS "Anyone can submit amenity feedback" ON public.lodge_amenity_feedback;
DROP POLICY IF EXISTS lodge_amenity_feedback_public_insert ON public.lodge_amenity_feedback;
CREATE POLICY lodge_amenity_feedback_public_insert
ON public.lodge_amenity_feedback FOR INSERT TO anon, authenticated
WITH CHECK (store_id IS NOT NULL AND length(coalesce(message,'')) BETWEEN 1 AND 2000);

DROP POLICY IF EXISTS "Anyone can insert map_pin_clicks" ON public.map_pin_clicks;
DROP POLICY IF EXISTS map_pin_clicks_public_insert ON public.map_pin_clicks;
CREATE POLICY map_pin_clicks_public_insert
ON public.map_pin_clicks FOR INSERT TO anon, authenticated
WITH CHECK (store_id IS NOT NULL);

DROP POLICY IF EXISTS "Public can create service bookings" ON public.service_bookings;
DROP POLICY IF EXISTS service_bookings_public_insert ON public.service_bookings;
CREATE POLICY service_bookings_public_insert
ON public.service_bookings FOR INSERT TO anon, authenticated
WITH CHECK (
  store_id IS NOT NULL
  AND length(coalesce(customer_name,'')) BETWEEN 1 AND 200
  AND length(coalesce(customer_email,'')) BETWEEN 3 AND 320
);

-- 4. Drop broad LIST policies on public buckets
DO $$
DECLARE bucket text;
DECLARE policy_name text;
BEGIN
  FOREACH bucket IN ARRAY ARRAY[
    'avatars','brand-logos','chat-media-files','chat_uploads','covers',
    'cv-photos','menu-photos','order-receipts','p2p-vehicle-images',
    'receipt-photos','store-ad-creatives','store-assets','store-posts',
    'user-posts','user-stories'
  ] LOOP
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='storage' AND tablename='objects' AND cmd='SELECT'
        AND (qual LIKE '%bucket_id = ''' || bucket || '''%' OR qual LIKE '%bucket_id=''' || bucket || '''%')
        AND qual NOT LIKE '%storage.foldername%'
        AND qual NOT LIKE '%auth.uid%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    END LOOP;
  END LOOP;
END $$;

-- 5. New fine-grained permissions catalog
--    (named app_role_permissions to avoid collision with existing
--     tenant-scoped role_permissions table)
CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, resource, action)
);

CREATE INDEX IF NOT EXISTS idx_app_role_permissions_role
  ON public.app_role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_app_role_permissions_resource_action
  ON public.app_role_permissions(resource, action);

ALTER TABLE public.app_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_role_permissions_admin_all ON public.app_role_permissions;
CREATE POLICY app_role_permissions_admin_all
ON public.app_role_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS app_role_permissions_authenticated_read ON public.app_role_permissions;
CREATE POLICY app_role_permissions_authenticated_read
ON public.app_role_permissions FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid, _resource text, _action text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id,'admin') OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.app_role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.resource = _resource
      AND rp.action  = _action
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text)
  TO authenticated, service_role;

INSERT INTO public.app_role_permissions (role, resource, action) VALUES
  ('moderator','posts','moderate'),
  ('moderator','comments','moderate'),
  ('moderator','users','warn'),
  ('moderator','reports','review'),
  ('admin','*','*')
ON CONFLICT DO NOTHING;
