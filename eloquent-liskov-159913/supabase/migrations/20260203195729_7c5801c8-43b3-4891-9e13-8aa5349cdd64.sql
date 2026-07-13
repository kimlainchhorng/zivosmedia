-- =============================================
-- ZIVO AUTOMATION ENGINE
-- =============================================

-- Automation rules configuration
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- booking, payment, cancellation, support, safety
  description TEXT,
  trigger_type TEXT NOT NULL, -- event, schedule, condition
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL, -- auto_confirm, auto_refund, auto_reply, auto_lock, alert
  action_config JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automation execution logs
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  trigger_event TEXT,
  entity_type TEXT, -- order, payment, ticket, user
  entity_id TEXT,
  input_data JSONB DEFAULT '{}',
  decision TEXT NOT NULL, -- executed, skipped, failed, escalated
  decision_reason TEXT,
  output_data JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled jobs
CREATE TABLE public.automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  job_type TEXT NOT NULL, -- retry_bookings, reconcile_payments, close_tickets, expire_promos, cleanup
  cron_expression TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT, -- success, failed, partial
  last_run_duration_ms INTEGER,
  last_run_summary JSONB DEFAULT '{}',
  next_run_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job execution history
CREATE TABLE public.automation_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.automation_jobs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- running, success, failed, partial
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safety locks (auto-locked accounts/IPs)
CREATE TABLE public.automation_safety_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_type TEXT NOT NULL, -- account, ip, device
  target_id TEXT NOT NULL,
  target_identifier TEXT, -- email, IP address, device ID
  reason TEXT NOT NULL,
  triggered_by_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  triggered_by_log_id UUID REFERENCES public.automation_logs(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  is_active BOOLEAN DEFAULT true,
  locked_at TIMESTAMPTZ DEFAULT now(),
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID,
  unlock_reason TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Internal alerts
CREATE TABLE public.automation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- booking_failure_spike, fraud_spike, webhook_error, api_outage, sla_breach
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  title TEXT NOT NULL,
  description TEXT,
  source TEXT, -- automation, system, manual
  source_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin overrides
CREATE TABLE public.automation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_type TEXT NOT NULL, -- pause_rule, manual_confirm, manual_refund, unlock_account, exception
  target_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  target_entity_type TEXT,
  target_entity_id TEXT,
  action_taken TEXT NOT NULL,
  reason TEXT NOT NULL,
  performed_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-support reply templates
CREATE TABLE public.automation_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_keywords TEXT[] NOT NULL,
  intent TEXT NOT NULL, -- booking_status, refund_status, cancellation_help, general
  reply_template TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_safety_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_reply_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin full access to automation_rules" ON public.automation_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_logs" ON public.automation_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_jobs" ON public.automation_jobs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_job_runs" ON public.automation_job_runs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_safety_locks" ON public.automation_safety_locks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_alerts" ON public.automation_alerts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_overrides" ON public.automation_overrides
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to automation_reply_templates" ON public.automation_reply_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_id);
CREATE INDEX idx_automation_logs_entity ON public.automation_logs(entity_type, entity_id);
CREATE INDEX idx_automation_logs_created ON public.automation_logs(created_at DESC);
CREATE INDEX idx_automation_job_runs_job ON public.automation_job_runs(job_id);
CREATE INDEX idx_automation_safety_locks_target ON public.automation_safety_locks(lock_type, target_id);
CREATE INDEX idx_automation_safety_locks_active ON public.automation_safety_locks(is_active) WHERE is_active = true;
CREATE INDEX idx_automation_alerts_resolved ON public.automation_alerts(is_resolved, severity);

-- Seed automation rules
INSERT INTO public.automation_rules (name, slug, category, description, trigger_type, trigger_config, action_type, action_config, conditions, priority) VALUES
  -- Booking automations
  ('Auto-confirm low-risk bookings', 'auto-confirm-low-risk', 'booking', 'Automatically confirm bookings when payment succeeds and fraud risk is low', 'event', '{"event": "payment_succeeded"}', 'auto_confirm', '{"notify_user": true, "send_email": true}', '[{"field": "fraud_risk", "operator": "lte", "value": 30}]', 1),
  ('Auto-refund failed bookings', 'auto-refund-failed-booking', 'booking', 'Automatically refund when supplier booking fails after retries', 'event', '{"event": "supplier_booking_failed", "after_retries": 3}', 'auto_refund', '{"notify_user": true, "reason": "booking_failed"}', '[]', 2),
  
  -- Payment automations
  ('Delay capture for medium-risk', 'delay-capture-medium-risk', 'payment', 'Delay payment capture for orders with medium fraud risk', 'event', '{"event": "order_created"}', 'delay_capture', '{"delay_hours": 2}', '[{"field": "fraud_risk", "operator": "between", "value": [31, 70]}]', 1),
  ('Auto-refund on chargeback', 'auto-refund-chargeback', 'payment', 'Process refund when chargeback is detected', 'event', '{"event": "chargeback_received"}', 'auto_refund', '{"lock_account": true, "notify_admin": true}', '[]', 1),
  
  -- Cancellation automations
  ('Auto-approve eligible cancellations', 'auto-approve-cancellation', 'cancellation', 'Automatically approve cancellations within policy deadline', 'event', '{"event": "cancellation_requested"}', 'auto_approve', '{"trigger_refund": true, "notify_user": true}', '[{"field": "within_cancellation_window", "operator": "eq", "value": true}, {"field": "policy_allows", "operator": "eq", "value": true}]', 1),
  ('Auto-reject late cancellations', 'auto-reject-late-cancel', 'cancellation', 'Automatically reject cancellations past deadline with explanation', 'event', '{"event": "cancellation_requested"}', 'auto_reject', '{"send_policy_explanation": true}', '[{"field": "within_cancellation_window", "operator": "eq", "value": false}]', 2),
  
  -- Safety automations
  ('Lock account on repeated fraud', 'lock-repeated-fraud', 'safety', 'Lock accounts with 3+ fraud flags in 24 hours', 'condition', '{"check_interval": "1h"}', 'auto_lock', '{"lock_type": "account", "duration_hours": 48}', '[{"field": "fraud_flags_24h", "operator": "gte", "value": 3}]', 1),
  ('Block abusive IPs', 'block-abusive-ips', 'safety', 'Block IPs with abuse patterns', 'condition', '{"check_interval": "15m"}', 'auto_lock', '{"lock_type": "ip", "duration_hours": 24}', '[{"field": "requests_per_minute", "operator": "gte", "value": 100}]', 1),
  
  -- Alert automations
  ('Alert on booking failure spike', 'alert-booking-failure-spike', 'alert', 'Alert admins when booking failure rate exceeds threshold', 'condition', '{"check_interval": "5m"}', 'alert', '{"severity": "critical", "channels": ["dashboard", "email"]}', '[{"field": "failure_rate_1h", "operator": "gte", "value": 20}]', 1),
  ('Alert on API outage', 'alert-api-outage', 'alert', 'Alert when supplier API is unresponsive', 'condition', '{"check_interval": "1m"}', 'alert', '{"severity": "critical", "channels": ["dashboard", "email", "slack"]}', '[{"field": "api_error_rate_5m", "operator": "gte", "value": 80}]', 1);

-- Seed scheduled jobs
INSERT INTO public.automation_jobs (name, slug, description, job_type, cron_expression, config) VALUES
  ('Retry Failed Bookings', 'retry-failed-bookings', 'Retry bookings that failed due to temporary errors', 'retry_bookings', '*/15 * * * *', '{"max_retries": 3, "retry_after_minutes": 15}'),
  ('Reconcile Payments', 'reconcile-payments', 'Daily reconciliation of Stripe payments with orders', 'reconcile_payments', '0 2 * * *', '{"lookback_days": 7}'),
  ('Close Inactive Tickets', 'close-inactive-tickets', 'Auto-close tickets with no activity for 7 days', 'close_tickets', '0 3 * * *', '{"inactive_days": 7, "send_notification": true}'),
  ('Expire Promotions', 'expire-promos', 'Deactivate expired promo codes', 'expire_promos', '0 0 * * *', '{}'),
  ('Cleanup Temp Data', 'cleanup-temp', 'Remove temporary data older than 30 days', 'cleanup', '0 4 * * 0', '{"retention_days": 30}'),
  ('Fraud Score Refresh', 'fraud-refresh', 'Recalculate fraud scores for pending orders', 'fraud_refresh', '*/30 * * * *', '{}');

-- Seed auto-reply templates
INSERT INTO public.automation_reply_templates (trigger_keywords, intent, reply_template, priority) VALUES
  (ARRAY['where is my booking', 'booking status', 'is my booking confirmed'], 'booking_status', 'Hi! Your booking {{order_number}} is currently {{status}}. You can view the full details in your Trips page. If you need further assistance, reply to this message and a team member will help you.', 1),
  (ARRAY['refund status', 'when will i get refund', 'refund pending'], 'refund_status', 'Your refund for order {{order_number}} is {{refund_status}}. Refunds typically take 5-10 business days to appear in your account. If it has been longer, please reply and we will investigate.', 1),
  (ARRAY['how do i cancel', 'cancel my booking', 'cancellation'], 'cancellation_help', 'To cancel your booking, go to your Trips page and select the booking you wish to cancel. If eligible under our cancellation policy, you can cancel directly. For bookings within 24 hours of departure, please contact us directly.', 1),
  (ARRAY['contact support', 'speak to agent', 'human'], 'escalate', 'Thanks for reaching out! A support team member will respond within {{sla_hours}} hours. For urgent matters, you can reach us at support@hizovo.com.', 2);