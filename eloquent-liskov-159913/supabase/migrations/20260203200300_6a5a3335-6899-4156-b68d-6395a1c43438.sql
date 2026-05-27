-- Create DR emergency contacts (separate from driver emergency contacts)
CREATE TABLE IF NOT EXISTS public.dr_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  priority INTEGER DEFAULT 1,
  escalation_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create active_incidents table for DR
CREATE TABLE IF NOT EXISTS public.dr_active_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  title TEXT NOT NULL,
  description TEXT,
  affected_services TEXT[],
  started_at TIMESTAMPTZ DEFAULT now(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  response_lead UUID,
  communication_sent BOOLEAN DEFAULT false,
  communication_sent_at TIMESTAMPTZ,
  root_cause TEXT,
  resolution_steps TEXT,
  lessons_learned TEXT,
  post_mortem_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create api_key_rotations table
CREATE TABLE IF NOT EXISTS public.dr_key_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  key_identifier TEXT NOT NULL,
  rotation_reason TEXT NOT NULL,
  rotated_at TIMESTAMPTZ DEFAULT now(),
  rotated_by UUID,
  next_rotation_due TIMESTAMPTZ,
  is_emergency BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dr_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_active_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dr_key_rotations ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Admin full access to dr_emergency_contacts" ON public.dr_emergency_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to dr_active_incidents" ON public.dr_active_incidents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to dr_key_rotations" ON public.dr_key_rotations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_dr_incidents_status ON public.dr_active_incidents(status, severity);
CREATE INDEX idx_dr_incidents_started ON public.dr_active_incidents(started_at DESC);

-- Seed emergency contacts
INSERT INTO public.dr_emergency_contacts (contact_type, contact_name, role, email, priority, escalation_order) VALUES
  ('internal', 'On-Call Engineer', 'Primary Responder', 'oncall@hizovo.com', 1, 1),
  ('internal', 'Engineering Lead', 'Secondary Responder', 'engineering@hizovo.com', 2, 2),
  ('internal', 'CTO', 'Executive Escalation', 'cto@hizovo.com', 3, 3),
  ('payment_provider', 'Stripe Support', 'Payment Issues', NULL, 1, 1),
  ('supplier', 'Duffel Support', 'Flight API Issues', 'support@duffel.com', 1, 1),
  ('hosting', 'Supabase Support', 'Database/Hosting', NULL, 1, 1),
  ('legal', 'Legal Counsel', 'Breach/Compliance', 'legal@hizovo.com', 1, 1);

-- Seed incident templates
INSERT INTO public.incident_templates (template_name, template_type, incident_severity, subject, body, variables) VALUES
  ('Service Disruption - Email', 'email', 'major', 
   'ZIVO Service Update - {{service_name}}', 
   'We are currently experiencing temporary issues with {{service_name}}. Our team is actively working to restore full functionality. We apologize for any inconvenience.', 
   ARRAY['service_name', 'status', 'eta']),
  ('Payment Delay Notice', 'email', 'minor',
   'ZIVO Payment Processing Update',
   'Some payment transactions are experiencing slight delays. Your payment is secure and will be processed shortly.',
   ARRAY[]::TEXT[]),
  ('Security Incident Notice', 'email', 'critical',
   'Important Security Notice from ZIVO',
   'We recently detected unusual activity and have taken immediate steps to protect your account. Please review your recent activity.',
   ARRAY[]::TEXT[]),
  ('Service Restored', 'email', 'minor',
   'ZIVO Service Restored - {{service_name}}',
   'Good news! {{service_name}} is now fully operational. Thank you for your patience.',
   ARRAY['service_name']),
  ('Maintenance Scheduled', 'in_app', 'minor',
   'Scheduled Maintenance',
   '{{service_name}} will undergo scheduled maintenance on {{date}} from {{start_time}} to {{end_time}}.',
   ARRAY['service_name', 'date', 'start_time', 'end_time'])
ON CONFLICT DO NOTHING;

-- Seed DR config if not exists
INSERT INTO public.dr_configuration (config_key, config_value, description) VALUES
  ('rpo_minutes', '60', 'Recovery Point Objective - max acceptable data loss in minutes'),
  ('rto_minutes', '240', 'Recovery Time Objective - target restore time in minutes'),
  ('backup_retention_days', '90', 'Number of days to retain backups'),
  ('backup_frequency_hours', '1', 'Frequency of incremental backups in hours'),
  ('full_backup_schedule', '"0 2 * * *"', 'Cron expression for daily full backups'),
  ('auto_pause_on_outage', 'true', 'Automatically pause bookings when provider is down'),
  ('incident_auto_alert', 'true', 'Automatically alert admins on incident detection'),
  ('key_rotation_days', '90', 'Days between scheduled API key rotations')
ON CONFLICT (config_key) DO NOTHING;

-- Seed service health status
INSERT INTO public.service_health_status (service_name, status, uptime_percent) VALUES
  ('flights', 'operational', 99.95),
  ('hotels', 'operational', 99.90),
  ('cars', 'operational', 99.85),
  ('rides', 'operational', 99.92),
  ('eats', 'operational', 99.88),
  ('auth', 'operational', 99.99),
  ('payments', 'operational', 99.97),
  ('storage', 'operational', 99.99)
ON CONFLICT (service_name) DO NOTHING;