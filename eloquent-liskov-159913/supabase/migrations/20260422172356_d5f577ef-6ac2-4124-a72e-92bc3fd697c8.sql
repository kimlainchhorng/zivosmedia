-- 1. Remediation actions audit log
CREATE TABLE IF NOT EXISTS public.lodging_wiring_remediation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_id uuid NOT NULL DEFAULT auth.uid(),
  run_id uuid REFERENCES public.lodging_wiring_report_runs(id) ON DELETE SET NULL,
  check_id text NOT NULL,
  check_name text,
  action_type text NOT NULL CHECK (action_type IN ('copy_fix_sql','copy_failing_query','open_sql_editor','mark_resolved')),
  editor_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.lodging_wiring_remediation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view remediation actions"
  ON public.lodging_wiring_remediation_actions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert their own remediation actions"
  ON public.lodging_wiring_remediation_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_lwra_run_id ON public.lodging_wiring_remediation_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_lwra_created_at_desc ON public.lodging_wiring_remediation_actions(created_at DESC);

-- 2. Stripe webhook event log
CREATE TABLE IF NOT EXISTS public.lodging_stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  event_created_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  reservation_id uuid,
  stripe_payment_intent_id text,
  stripe_session_id text,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','applied','skipped','error')),
  error_message text,
  payload jsonb
);

ALTER TABLE public.lodging_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.lodging_stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_lswe_event_type ON public.lodging_stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lswe_reservation_id ON public.lodging_stripe_webhook_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_lswe_received_at_desc ON public.lodging_stripe_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_lswe_pi ON public.lodging_stripe_webhook_events(stripe_payment_intent_id);

-- 3. Deposit retry attempts (dedup)
CREATE TABLE IF NOT EXISTS public.lodging_deposit_retry_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key text NOT NULL UNIQUE,
  reservation_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  result text,
  checkout_url text,
  stripe_session_id text
);

ALTER TABLE public.lodging_deposit_retry_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view retry attempts"
  ON public.lodging_deposit_retry_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ldra_reservation_started ON public.lodging_deposit_retry_attempts(reservation_id, started_at DESC);

-- 4. Schema version on wiring report runs
ALTER TABLE public.lodging_wiring_report_runs
  ADD COLUMN IF NOT EXISTS schema_version int NOT NULL DEFAULT 1;