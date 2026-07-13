
-- Wiring-check RPC for the lodging booking workflow.
-- Returns a JSON report with pass/fail per check; admin-only.

CREATE OR REPLACE FUNCTION public.lodging_wiring_report()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  checks jsonb := '[]'::jsonb;

  rls_res boolean;
  rls_audit boolean;
  pub_res boolean;
  pub_audit boolean;
  fk_room boolean;
  fk_audit boolean;
  idx_store boolean;
  idx_pi boolean;
  idx_audit boolean;
  col_consent boolean;
  col_consent_v boolean;
  col_last_err boolean;
  nights_default boolean;
  extras_default boolean;
  trig_audit boolean;

  res_count int;
  audit_count int;
BEGIN
  -- Admin gate
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin;
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- 1. RLS enabled
  SELECT relrowsecurity INTO rls_res    FROM pg_class WHERE oid = 'public.lodge_reservations'::regclass;
  SELECT relrowsecurity INTO rls_audit  FROM pg_class WHERE oid = 'public.lodge_reservation_audit'::regclass;

  -- 2. Realtime publication membership
  SELECT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lodge_reservations') INTO pub_res;
  SELECT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lodge_reservation_audit') INTO pub_audit;

  -- 3. Foreign keys
  SELECT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'lodge_reservations_room_id_fkey'
                   AND conrelid = 'public.lodge_reservations'::regclass) INTO fk_room;
  SELECT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'lodge_reservation_audit_reservation_id_fkey'
                   AND conrelid = 'public.lodge_reservation_audit'::regclass) INTO fk_audit;

  -- 4. Indexes
  SELECT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'public' AND indexname = 'idx_lodge_reservations_store_status_checkin') INTO idx_store;
  SELECT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'public' AND indexname = 'idx_lodge_reservations_stripe_pi') INTO idx_pi;
  SELECT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE schemaname = 'public' AND indexname = 'idx_lodge_reservation_audit_reservation') INTO idx_audit;

  -- 5. Required columns for the booking workflow
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'lodge_reservations' AND column_name = 'policy_consent') INTO col_consent;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'lodge_reservations' AND column_name = 'policy_consent_version') INTO col_consent_v;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'lodge_reservations' AND column_name = 'last_payment_error') INTO col_last_err;

  -- 6. Money column defaults present
  SELECT (column_default IS NOT NULL AND is_nullable = 'NO')
    INTO extras_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'lodge_reservations' AND column_name = 'extras_cents';

  -- 7. nights computed/default exists (generated or default)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'lodge_reservations' AND column_name = 'nights') INTO nights_default;

  -- 8. Audit trigger exists
  SELECT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'public.lodge_reservations'::regclass
                   AND NOT tgisinternal) INTO trig_audit;

  -- Counts
  SELECT count(*) INTO res_count   FROM public.lodge_reservations;
  SELECT count(*) INTO audit_count FROM public.lodge_reservation_audit;

  checks := jsonb_build_array(
    jsonb_build_object('group','RLS',        'name','lodge_reservations RLS enabled',           'pass', COALESCE(rls_res,false),
                       'fix','ALTER TABLE public.lodge_reservations ENABLE ROW LEVEL SECURITY;'),
    jsonb_build_object('group','RLS',        'name','lodge_reservation_audit RLS enabled',      'pass', COALESCE(rls_audit,false),
                       'fix','ALTER TABLE public.lodge_reservation_audit ENABLE ROW LEVEL SECURITY;'),
    jsonb_build_object('group','Realtime',   'name','lodge_reservations in supabase_realtime',  'pass', COALESCE(pub_res,false),
                       'fix','ALTER PUBLICATION supabase_realtime ADD TABLE public.lodge_reservations;'),
    jsonb_build_object('group','Realtime',   'name','lodge_reservation_audit in supabase_realtime','pass', COALESCE(pub_audit,false),
                       'fix','ALTER PUBLICATION supabase_realtime ADD TABLE public.lodge_reservation_audit;'),
    jsonb_build_object('group','Foreign keys','name','room_id → lodge_rooms (SET NULL)',         'pass', COALESCE(fk_room,false),
                       'fix','See migration: lodge_reservations_room_id_fkey'),
    jsonb_build_object('group','Foreign keys','name','audit.reservation_id → reservations (CASCADE)','pass', COALESCE(fk_audit,false),
                       'fix','See migration: lodge_reservation_audit_reservation_id_fkey'),
    jsonb_build_object('group','Indexes',    'name','(store_id, status, check_in)',             'pass', COALESCE(idx_store,false),
                       'fix','CREATE INDEX idx_lodge_reservations_store_status_checkin ON public.lodge_reservations(store_id, status, check_in);'),
    jsonb_build_object('group','Indexes',    'name','stripe_payment_intent_id',                 'pass', COALESCE(idx_pi,false),
                       'fix','CREATE INDEX idx_lodge_reservations_stripe_pi ON public.lodge_reservations(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;'),
    jsonb_build_object('group','Indexes',    'name','audit (reservation_id, created_at)',       'pass', COALESCE(idx_audit,false),
                       'fix','CREATE INDEX idx_lodge_reservation_audit_reservation ON public.lodge_reservation_audit(reservation_id, created_at DESC);'),
    jsonb_build_object('group','Schema',     'name','policy_consent column',                    'pass', COALESCE(col_consent,false),
                       'fix','ALTER TABLE public.lodge_reservations ADD COLUMN policy_consent jsonb;'),
    jsonb_build_object('group','Schema',     'name','policy_consent_version column',            'pass', COALESCE(col_consent_v,false),
                       'fix','ALTER TABLE public.lodge_reservations ADD COLUMN policy_consent_version text;'),
    jsonb_build_object('group','Schema',     'name','last_payment_error column',                'pass', COALESCE(col_last_err,false),
                       'fix','ALTER TABLE public.lodge_reservations ADD COLUMN last_payment_error text;'),
    jsonb_build_object('group','Schema',     'name','extras_cents NOT NULL DEFAULT 0',          'pass', COALESCE(extras_default,false),
                       'fix','ALTER TABLE public.lodge_reservations ALTER COLUMN extras_cents SET DEFAULT 0, ALTER COLUMN extras_cents SET NOT NULL;'),
    jsonb_build_object('group','Schema',     'name','nights column present',                    'pass', COALESCE(nights_default,false),
                       'fix','ALTER TABLE public.lodge_reservations ADD COLUMN nights integer GENERATED ALWAYS AS ((check_out - check_in)) STORED;'),
    jsonb_build_object('group','Triggers',   'name','reservation triggers present',             'pass', COALESCE(trig_audit,false),
                       'fix','Re-create audit trigger on lodge_reservations.')
  );

  RETURN jsonb_build_object(
    'generated_at', now(),
    'reservations_count', res_count,
    'audit_count', audit_count,
    'checks', checks
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lodging_wiring_report() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lodging_wiring_report() TO authenticated;
