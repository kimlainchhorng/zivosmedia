-- =============================================
-- ZIVO DISASTER RECOVERY & BUSINESS CONTINUITY
-- =============================================

-- 1) BACKUP LOGS - Track all backup operations
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL, -- 'full', 'incremental', 'files', 'manual'
  backup_target TEXT NOT NULL, -- 'database', 'storage', 'documents', 'all'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  size_bytes BIGINT,
  storage_location TEXT, -- S3 path or storage reference
  retention_days INT DEFAULT 30,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  triggered_by UUID, -- admin who triggered manual backup
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) DR CONFIGURATION - Recovery objectives and settings
CREATE TABLE IF NOT EXISTS public.dr_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default DR configuration
INSERT INTO public.dr_configuration (config_key, config_value, description) VALUES
('rto_minutes', '240', 'Recovery Time Objective in minutes (default: 4 hours)'),
('rpo_minutes', '60', 'Recovery Point Objective in minutes (default: 1 hour)'),
('backup_schedule', '{"full_daily": "02:00", "incremental_hourly": true}', 'Backup schedule configuration'),
('retention_policy', '{"daily_days": 30, "monthly_months": 12}', 'Backup retention policy'),
('emergency_contacts', '[]', 'Emergency contact list for DR incidents'),
('failover_enabled', 'true', 'Whether automatic failover is enabled'),
('degraded_services', '[]', 'List of currently degraded services')
ON CONFLICT (config_key) DO NOTHING;

-- 3) SERVICE HEALTH STATUS - Track service availability
CREATE TABLE IF NOT EXISTS public.service_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- 'flights', 'cars', 'rides', 'eats', 'hotels', 'auth', 'payments'
  status TEXT NOT NULL DEFAULT 'operational', -- 'operational', 'degraded', 'outage', 'maintenance'
  is_paused BOOLEAN DEFAULT false,
  paused_reason TEXT,
  paused_at TIMESTAMPTZ,
  paused_by UUID,
  last_check_at TIMESTAMPTZ DEFAULT now(),
  uptime_percent DECIMAL(5,2) DEFAULT 100.00,
  incident_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_name)
);

-- Insert default service health records
INSERT INTO public.service_health_status (service_name, status) VALUES
('flights', 'operational'),
('hotels', 'operational'),
('cars', 'operational'),
('rides', 'operational'),
('eats', 'operational'),
('auth', 'operational'),
('payments', 'operational'),
('storage', 'operational')
ON CONFLICT (service_name) DO NOTHING;

-- 4) RECOVERY TESTS - Track DR test results
CREATE TABLE IF NOT EXISTS public.recovery_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL, -- 'full_restore', 'partial_restore', 'failover', 'backup_verify'
  test_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'passed', 'failed', 'cancelled'
  recovery_time_seconds INT,
  data_loss_seconds INT, -- Actual RPO achieved
  test_results JSONB DEFAULT '{}',
  issues_found TEXT[],
  conducted_by UUID,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) INCIDENT TEMPLATES - Pre-defined communication templates
CREATE TABLE IF NOT EXISTS public.incident_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'email', 'in_app', 'status_page', 'sms'
  incident_severity TEXT NOT NULL, -- 'minor', 'major', 'critical'
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[], -- Placeholder variables like {{service_name}}, {{eta}}
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default incident templates
INSERT INTO public.incident_templates (template_name, template_type, incident_severity, subject, body, variables) VALUES
('Service Outage - Email', 'email', 'major', 'ZIVO {{service_name}} Temporarily Unavailable', 
 'Dear Customer,\n\nWe are currently experiencing issues with our {{service_name}} service. Our team is working to resolve this as quickly as possible.\n\nExpected resolution: {{eta}}\n\nWe apologize for any inconvenience.\n\nThe ZIVO Team',
 ARRAY['service_name', 'eta']),
('Maintenance Notice - Email', 'email', 'minor', 'Scheduled Maintenance: {{service_name}}',
 'Dear Customer,\n\nWe will be performing scheduled maintenance on {{service_name}} on {{date}} from {{start_time}} to {{end_time}}.\n\nDuring this time, the service may be temporarily unavailable.\n\nThank you for your patience.\n\nThe ZIVO Team',
 ARRAY['service_name', 'date', 'start_time', 'end_time']),
('Service Degraded - In-App', 'in_app', 'minor', 'Service Notice',
 'We''re performing maintenance. Please try again shortly.',
 ARRAY[]::TEXT[]),
('Critical Outage - Email', 'email', 'critical', 'Urgent: ZIVO Service Disruption',
 'Dear Customer,\n\nWe are experiencing a significant service disruption affecting {{affected_services}}.\n\nOur engineering team has been mobilized and is working on resolution.\n\nStatus updates: https://status.hizivo.com\n\nWe sincerely apologize for the inconvenience.\n\nThe ZIVO Team',
 ARRAY['affected_services'])
ON CONFLICT DO NOTHING;

-- 6) RESTORE OPERATIONS - Track restore attempts
CREATE TABLE IF NOT EXISTS public.restore_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES public.backup_logs(id),
  restore_type TEXT NOT NULL, -- 'full', 'partial', 'point_in_time'
  target_environment TEXT NOT NULL, -- 'production', 'staging', 'test'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'in_progress', 'completed', 'failed', 'cancelled'
  requested_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recovery_point TIMESTAMPTZ, -- Point in time to restore to
  affected_tables TEXT[],
  rollback_available BOOLEAN DEFAULT false,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) SYSTEM HEALTH HISTORY - Historical health data
CREATE TABLE IF NOT EXISTS public.system_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  service_statuses JSONB NOT NULL, -- Snapshot of all service statuses
  overall_health TEXT NOT NULL, -- 'healthy', 'degraded', 'critical'
  active_incidents INT DEFAULT 0,
  metrics JSONB DEFAULT '{}' -- CPU, memory, response times, etc.
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON public.backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON public.backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_created ON public.backup_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_service_health_status ON public.service_health_status(status);
CREATE INDEX IF NOT EXISTS idx_recovery_tests_status ON public.recovery_tests(status);
CREATE INDEX IF NOT EXISTS idx_restore_operations_status ON public.restore_operations(status);
CREATE INDEX IF NOT EXISTS idx_system_health_recorded ON public.system_health_history(recorded_at);

-- Enable RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only for most, public read for service status
CREATE POLICY "Admins can manage backup_logs" ON public.backup_logs FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage dr_configuration" ON public.dr_configuration FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read service health" ON public.service_health_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage service health" ON public.service_health_status FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage recovery_tests" ON public.recovery_tests FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage incident_templates" ON public.incident_templates FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage restore_operations" ON public.restore_operations FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read system_health_history" ON public.system_health_history FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can write health history" ON public.system_health_history FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_service_health_updated_at BEFORE UPDATE ON public.service_health_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incident_templates_updated_at BEFORE UPDATE ON public.incident_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dr_configuration_updated_at BEFORE UPDATE ON public.dr_configuration
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check if a service is available
CREATE OR REPLACE FUNCTION public.is_service_available(p_service_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT NOT is_paused AND status = 'operational' 
     FROM public.service_health_status 
     WHERE service_name = p_service_name),
    true
  );
$$;