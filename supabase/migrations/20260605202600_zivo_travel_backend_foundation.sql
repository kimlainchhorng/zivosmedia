-- Zivo Travel backend foundation.
--
-- This migration is intentionally focused: it prepares the dedicated
-- Zivo Travel Supabase project for domain-level workflow tracking and
-- controlled source/target sync metadata without copying production rows.
-- Larger catalog/data transfer should run through auditable export/import
-- jobs once table-by-table ownership, RLS, and PII handling are confirmed.

CREATE OR REPLACE FUNCTION public.set_zivo_travel_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.zivo_travel_backend_links (
  id text PRIMARY KEY,
  label text NOT NULL,
  project_ref text NOT NULL,
  project_url text NOT NULL,
  role text NOT NULL CHECK (role IN ('source', 'target', 'bridge')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zivo_travel_service_catalog (
  id text PRIMARY KEY,
  service_type text NOT NULL CHECK (service_type IN ('flight', 'hotel', 'rental_car', 'bus')),
  title text NOT NULL,
  description text NOT NULL,
  href text NOT NULL,
  accent text NOT NULL DEFAULT 'emerald',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'coming_soon', 'paused')),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zivo_travel_search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type IN ('flight', 'hotel', 'rental_car', 'bus')),
  origin text,
  destination text,
  pickup text,
  dropoff text,
  date_start date,
  date_end date,
  travelers integer NOT NULL DEFAULT 1 CHECK (travelers > 0 AND travelers <= 99),
  rooms integer CHECK (rooms IS NULL OR (rooms > 0 AND rooms <= 50)),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_host text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zivo_travel_partner_workflows (
  id text PRIMARY KEY,
  workflow_type text NOT NULL CHECK (workflow_type IN ('payment', 'payout', 'cash_out', 'api', 'sso', 'seo')),
  title text NOT NULL,
  description text NOT NULL,
  href text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('live', 'planned', 'paused')),
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zivo_travel_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_ref text NOT NULL DEFAULT 'slirphzzwcogdbkeicff',
  target_project_ref text NOT NULL DEFAULT 'xbllvmpomorawkcrtbcq',
  sync_scope text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'completed', 'failed', 'cancelled')),
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zivo_travel_service_catalog_type
  ON public.zivo_travel_service_catalog(service_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_zivo_travel_search_events_created
  ON public.zivo_travel_search_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zivo_travel_search_events_user
  ON public.zivo_travel_search_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zivo_travel_partner_workflows_type
  ON public.zivo_travel_partner_workflows(workflow_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_zivo_travel_sync_runs_scope
  ON public.zivo_travel_sync_runs(sync_scope, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_zivo_travel_backend_links_updated ON public.zivo_travel_backend_links;
CREATE TRIGGER trg_zivo_travel_backend_links_updated
  BEFORE UPDATE ON public.zivo_travel_backend_links
  FOR EACH ROW EXECUTE FUNCTION public.set_zivo_travel_updated_at();

DROP TRIGGER IF EXISTS trg_zivo_travel_service_catalog_updated ON public.zivo_travel_service_catalog;
CREATE TRIGGER trg_zivo_travel_service_catalog_updated
  BEFORE UPDATE ON public.zivo_travel_service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_zivo_travel_updated_at();

DROP TRIGGER IF EXISTS trg_zivo_travel_partner_workflows_updated ON public.zivo_travel_partner_workflows;
CREATE TRIGGER trg_zivo_travel_partner_workflows_updated
  BEFORE UPDATE ON public.zivo_travel_partner_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_zivo_travel_updated_at();

DROP TRIGGER IF EXISTS trg_zivo_travel_sync_runs_updated ON public.zivo_travel_sync_runs;
CREATE TRIGGER trg_zivo_travel_sync_runs_updated
  BEFORE UPDATE ON public.zivo_travel_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_zivo_travel_updated_at();

ALTER TABLE public.zivo_travel_backend_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_travel_service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_travel_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_travel_partner_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_travel_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zivo_travel_backend_links_public_read ON public.zivo_travel_backend_links;
CREATE POLICY zivo_travel_backend_links_public_read
  ON public.zivo_travel_backend_links
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS zivo_travel_service_catalog_public_read ON public.zivo_travel_service_catalog;
CREATE POLICY zivo_travel_service_catalog_public_read
  ON public.zivo_travel_service_catalog
  FOR SELECT
  TO anon, authenticated
  USING (status = 'live');

DROP POLICY IF EXISTS zivo_travel_search_events_public_insert ON public.zivo_travel_search_events;
CREATE POLICY zivo_travel_search_events_public_insert
  ON public.zivo_travel_search_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS zivo_travel_search_events_owner_read ON public.zivo_travel_search_events;
CREATE POLICY zivo_travel_search_events_owner_read
  ON public.zivo_travel_search_events
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS zivo_travel_partner_workflows_public_read ON public.zivo_travel_partner_workflows;
CREATE POLICY zivo_travel_partner_workflows_public_read
  ON public.zivo_travel_partner_workflows
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('live', 'planned'));

DROP POLICY IF EXISTS zivo_travel_sync_runs_authenticated_read ON public.zivo_travel_sync_runs;
CREATE POLICY zivo_travel_sync_runs_authenticated_read
  ON public.zivo_travel_sync_runs
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON TABLE public.zivo_travel_backend_links TO anon, authenticated;
GRANT SELECT ON TABLE public.zivo_travel_service_catalog TO anon, authenticated;
GRANT SELECT ON TABLE public.zivo_travel_partner_workflows TO anon, authenticated;
GRANT INSERT ON TABLE public.zivo_travel_search_events TO anon, authenticated;
GRANT SELECT ON TABLE public.zivo_travel_search_events TO authenticated;
GRANT SELECT ON TABLE public.zivo_travel_sync_runs TO authenticated;

INSERT INTO public.zivo_travel_backend_links (id, label, project_ref, project_url, role, notes)
VALUES
  (
    'zivosmedia-source',
    'Zivos Media source backend',
    'slirphzzwcogdbkeicff',
    'https://slirphzzwcogdbkeicff.supabase.co',
    'source',
    '{"scope":["existing hotel/lodging data","legacy travel functions","bus rows"],"copy_strategy":"audited bridge before bulk copy"}'::jsonb
  ),
  (
    'zivostravel-target',
    'Zivo Travel target backend',
    'xbllvmpomorawkcrtbcq',
    'https://xbllvmpomorawkcrtbcq.supabase.co',
    'target',
    '{"scope":["travel website telemetry","future dedicated flight/hotel/car/bus catalog"],"domain":"zivostravel.com"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  project_ref = EXCLUDED.project_ref,
  project_url = EXCLUDED.project_url,
  role = EXCLUDED.role,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.zivo_travel_service_catalog
  (id, service_type, title, description, href, accent, sort_order, metadata)
VALUES
  ('flights', 'flight', 'Flights', 'Search routes, compare cabin options, and continue to flight checkout.', '/flights', 'sky', 10, '{"cta":"Search flights"}'::jsonb),
  ('hotels', 'hotel', 'Hotels', 'Discover hotels, resorts, rooms, lodging extras, and guest workflows.', '/hotels', 'violet', 20, '{"cta":"Find hotels"}'::jsonb),
  ('rental-cars', 'rental_car', 'Rental Car', 'Book cars, pickup windows, add-ons, deposits, and reservation follow-up.', '/cars', 'emerald', 30, '{"cta":"Rent a car"}'::jsonb),
  ('booking-bus', 'bus', 'Booking Bus', 'Find bus routes, seats, tickets, operator schedules, and trip status.', '/bus', 'coral', 40, '{"cta":"Book bus"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  service_type = EXCLUDED.service_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  href = EXCLUDED.href,
  accent = EXCLUDED.accent,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.zivo_travel_partner_workflows
  (id, workflow_type, title, description, href, status, sort_order, metadata)
VALUES
  ('payments', 'payment', 'Payments', 'Secure checkout, deposits, partner payment intents, and refunds.', '/travel/checkout', 'planned', 10, '{}'::jsonb),
  ('payouts', 'payout', 'Payouts', 'Partner payout tracking for hotels, car operators, bus operators, and affiliates.', '/wallet', 'planned', 20, '{}'::jsonb),
  ('cash-out', 'cash_out', 'Cash out', 'Fast payout and cash-out readiness for approved partners.', '/wallet', 'planned', 30, '{}'::jsonb),
  ('api-access', 'api', 'API access', 'Future partner API bridge between Zivos Media and Zivo Travel.', '/connect-website', 'planned', 40, '{}'::jsonb),
  ('sso-security', 'sso', 'SSO & security', 'Account access, auth callbacks, audit logs, and secure sessions.', '/login', 'planned', 50, '{}'::jsonb),
  ('seo', 'seo', 'SEO', 'Search-ready travel pages for flights, hotels, rental cars, and bus routes.', '/guides/cheap-flights', 'planned', 60, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  workflow_type = EXCLUDED.workflow_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  href = EXCLUDED.href,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.zivo_travel_sync_runs
  (sync_scope, status, row_counts, notes)
VALUES
  (
    'initial-discovery',
    'planned',
    '{"source_project":"slirphzzwcogdbkeicff","target_project":"xbllvmpomorawkcrtbcq","known_hotel_like_store_profiles":948,"basic_travel_tables_checked":["airlines","flights","hotels","rental_cars","bus_routes","bus_trips","bus_bookings"]}'::jsonb,
    'Discovery showed the target project was empty. Bulk transfer is intentionally separate from the public website launch so RLS, PII, storage assets, and Edge Function secrets can be audited first.'
  );
