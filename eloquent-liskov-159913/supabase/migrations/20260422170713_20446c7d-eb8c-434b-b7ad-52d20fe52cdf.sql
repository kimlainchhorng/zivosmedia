-- 1. Schema additions
ALTER TABLE public.lodge_reservations
  ADD COLUMN IF NOT EXISTS stripe_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_last_event_type text,
  ADD COLUMN IF NOT EXISTS payment_lock_token text,
  ADD COLUMN IF NOT EXISTS payment_lock_expires_at timestamptz;

-- 2. History table
CREATE TABLE IF NOT EXISTS public.lodging_wiring_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  summary jsonb NOT NULL,
  pass_count int NOT NULL DEFAULT 0,
  fail_count int NOT NULL DEFAULT 0,
  ran_by uuid
);

CREATE INDEX IF NOT EXISTS idx_lodging_wiring_runs_ran_at
  ON public.lodging_wiring_report_runs (ran_at DESC);

ALTER TABLE public.lodging_wiring_report_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view wiring runs" ON public.lodging_wiring_report_runs;
CREATE POLICY "Admins can view wiring runs"
  ON public.lodging_wiring_report_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert wiring runs" ON public.lodging_wiring_report_runs;
CREATE POLICY "Admins can insert wiring runs"
  ON public.lodging_wiring_report_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_trim_lodging_wiring_runs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.lodging_wiring_report_runs
  WHERE id IN (
    SELECT id FROM public.lodging_wiring_report_runs
    ORDER BY ran_at DESC OFFSET 200
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trim_lodging_wiring_runs ON public.lodging_wiring_report_runs;
CREATE TRIGGER trim_lodging_wiring_runs
  AFTER INSERT ON public.lodging_wiring_report_runs
  FOR EACH STATEMENT EXECUTE FUNCTION public.tg_trim_lodging_wiring_runs();

-- 3. Updated wiring report with failing_query + editor_url
CREATE OR REPLACE FUNCTION public.lodging_wiring_report()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  checks jsonb := '[]'::jsonb;
  rls_res boolean;
  pub_res boolean;
  pub_audit boolean;
  fk_room boolean;
  fk_audit boolean;
  has_idx_store boolean;
  has_idx_pi boolean;
  nights_generated boolean;
  defaults_ok boolean;
  pass_n int := 0;
  fail_n int := 0;
  editor_base text := 'https://supabase.com/dashboard/project/slirphzzwcogdbkeicff/sql/new?content=';

  fix_rls text := 'ALTER TABLE public.lodge_reservations ENABLE ROW LEVEL SECURITY;';
  fix_pub_res text := 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lodge_reservations;';
  fix_pub_audit text := 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lodge_reservation_audit;';
  fix_fk_room text := 'ALTER TABLE public.lodge_reservations ADD CONSTRAINT lodge_reservations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.lodge_rooms(id) ON DELETE SET NULL;';
  fix_fk_audit text := 'ALTER TABLE public.lodge_reservation_audit ADD CONSTRAINT lodge_reservation_audit_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.lodge_reservations(id) ON DELETE CASCADE;';
  fix_idx_store text := 'CREATE INDEX IF NOT EXISTS idx_lodge_reservations_store_status_checkin ON public.lodge_reservations (store_id, status, check_in);';
  fix_idx_pi text := 'CREATE INDEX IF NOT EXISTS idx_lodge_reservations_stripe_pi ON public.lodge_reservations (stripe_payment_intent_id);';
  fix_nights text := 'ALTER TABLE public.lodge_reservations DROP COLUMN nights; ALTER TABLE public.lodge_reservations ADD COLUMN nights int GENERATED ALWAYS AS ((check_out - check_in)) STORED;';
  fix_defaults text := 'ALTER TABLE public.lodge_reservations ALTER COLUMN extras_cents SET DEFAULT 0, ALTER COLUMN tax_cents SET DEFAULT 0, ALTER COLUMN paid_cents SET DEFAULT 0;';
BEGIN
  SELECT relrowsecurity INTO rls_res FROM pg_class WHERE oid = 'public.lodge_reservations'::regclass;
  checks := checks || jsonb_build_object(
    'id','rls_lodge_reservations','group','Security','name','RLS enabled on lodge_reservations',
    'pass', COALESCE(rls_res,false), 'severity','critical',
    'message', CASE WHEN rls_res THEN 'Row level security is active.' ELSE 'RLS is disabled — guests could read all reservations.' END,
    'fix', fix_rls,
    'failing_query','SELECT relrowsecurity FROM pg_class WHERE oid = ''public.lodge_reservations''::regclass;',
    'editor_url', editor_base || replace(replace(fix_rls,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='lodge_reservations') INTO pub_res;
  checks := checks || jsonb_build_object(
    'id','realtime_lodge_reservations','group','Realtime','name','lodge_reservations in supabase_realtime',
    'pass', pub_res, 'severity','high',
    'message', CASE WHEN pub_res THEN 'Live updates enabled.' ELSE 'Status changes will not stream to the UI.' END,
    'fix', fix_pub_res,
    'failing_query','SELECT 1 FROM pg_publication_tables WHERE pubname=''supabase_realtime'' AND tablename=''lodge_reservations'';',
    'editor_url', editor_base || replace(replace(fix_pub_res,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='lodge_reservation_audit') INTO pub_audit;
  checks := checks || jsonb_build_object(
    'id','realtime_lodge_audit','group','Realtime','name','lodge_reservation_audit in supabase_realtime',
    'pass', pub_audit, 'severity','medium',
    'message', CASE WHEN pub_audit THEN 'Audit rows stream live.' ELSE 'Audit history will require manual refresh.' END,
    'fix', fix_pub_audit,
    'failing_query','SELECT 1 FROM pg_publication_tables WHERE pubname=''supabase_realtime'' AND tablename=''lodge_reservation_audit'';',
    'editor_url', editor_base || replace(replace(fix_pub_audit,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.lodge_reservations'::regclass AND contype='f' AND conname ILIKE '%room%') INTO fk_room;
  checks := checks || jsonb_build_object(
    'id','fk_room_id','group','Schema','name','Foreign key on room_id',
    'pass', fk_room, 'severity','medium',
    'message', CASE WHEN fk_room THEN 'room_id references lodge_rooms.' ELSE 'Missing FK — room deletions could orphan reservations.' END,
    'fix', fix_fk_room,
    'failing_query','SELECT conname FROM pg_constraint WHERE conrelid=''public.lodge_reservations''::regclass AND contype=''f'';',
    'editor_url', editor_base || replace(replace(fix_fk_room,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.lodge_reservation_audit'::regclass AND contype='f') INTO fk_audit;
  checks := checks || jsonb_build_object(
    'id','fk_audit_reservation','group','Schema','name','Foreign key on audit.reservation_id',
    'pass', fk_audit, 'severity','medium',
    'message', CASE WHEN fk_audit THEN 'Audit rows cascade with reservations.' ELSE 'Missing FK — audit history could orphan.' END,
    'fix', fix_fk_audit,
    'failing_query','SELECT conname FROM pg_constraint WHERE conrelid=''public.lodge_reservation_audit''::regclass AND contype=''f'';',
    'editor_url', editor_base || replace(replace(fix_fk_audit,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='lodge_reservations' AND indexname='idx_lodge_reservations_store_status_checkin') INTO has_idx_store;
  checks := checks || jsonb_build_object(
    'id','idx_store_status_checkin','group','Performance','name','Index (store_id, status, check_in)',
    'pass', has_idx_store, 'severity','low',
    'message', CASE WHEN has_idx_store THEN 'Host list query is indexed.' ELSE 'Host list will degrade as data grows.' END,
    'fix', fix_idx_store,
    'failing_query','SELECT indexname FROM pg_indexes WHERE schemaname=''public'' AND tablename=''lodge_reservations'';',
    'editor_url', editor_base || replace(replace(fix_idx_store,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='lodge_reservations' AND indexname='idx_lodge_reservations_stripe_pi') INTO has_idx_pi;
  checks := checks || jsonb_build_object(
    'id','idx_stripe_pi','group','Performance','name','Index on stripe_payment_intent_id',
    'pass', has_idx_pi, 'severity','low',
    'message', CASE WHEN has_idx_pi THEN 'Webhook lookups are O(log n).' ELSE 'Webhook lookups will full-scan as data grows.' END,
    'fix', fix_idx_pi,
    'failing_query','SELECT indexname FROM pg_indexes WHERE schemaname=''public'' AND tablename=''lodge_reservations'';',
    'editor_url', editor_base || replace(replace(fix_idx_pi,' ','%20'),E'\n','%0A')
  );

  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lodge_reservations' AND column_name='nights' AND is_generated='ALWAYS') INTO nights_generated;
  checks := checks || jsonb_build_object(
    'id','nights_generated','group','Schema','name','nights is a generated column',
    'pass', nights_generated, 'severity','medium',
    'message', CASE WHEN nights_generated THEN 'Auto-computed from check_in/check_out.' ELSE 'nights may drift from dates.' END,
    'fix', fix_nights,
    'failing_query','SELECT is_generated FROM information_schema.columns WHERE table_schema=''public'' AND table_name=''lodge_reservations'' AND column_name=''nights'';',
    'editor_url', editor_base || replace(replace(fix_nights,' ','%20'),E'\n','%0A')
  );

  SELECT (
    (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='lodge_reservations' AND column_name='extras_cents') IS NOT NULL AND
    (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='lodge_reservations' AND column_name='tax_cents') IS NOT NULL AND
    (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='lodge_reservations' AND column_name='paid_cents') IS NOT NULL
  ) INTO defaults_ok;
  checks := checks || jsonb_build_object(
    'id','financial_defaults','group','Schema','name','Financial columns default to 0',
    'pass', COALESCE(defaults_ok,false), 'severity','low',
    'message', CASE WHEN defaults_ok THEN 'extras/tax/paid never NULL.' ELSE 'NULL totals could break price math.' END,
    'fix', fix_defaults,
    'failing_query','SELECT column_name, column_default FROM information_schema.columns WHERE table_schema=''public'' AND table_name=''lodge_reservations'' AND column_name IN (''extras_cents'',''tax_cents'',''paid_cents'');',
    'editor_url', editor_base || replace(replace(fix_defaults,' ','%20'),E'\n','%0A')
  );

  SELECT
    COUNT(*) FILTER (WHERE (c->>'pass')::boolean = true),
    COUNT(*) FILTER (WHERE (c->>'pass')::boolean = false)
  INTO pass_n, fail_n
  FROM jsonb_array_elements(checks) c;

  RETURN jsonb_build_object('ran_at', now(), 'pass_count', pass_n, 'fail_count', fail_n, 'checks', checks);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lodging_wiring_report() TO authenticated;