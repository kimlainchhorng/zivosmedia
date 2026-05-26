-- =====================================================
-- ZIVO Production Launch, Go-Live & Scale System
-- =====================================================

-- Create enum for launch phases
CREATE TYPE public.launch_phase AS ENUM ('pre_launch', 'soft_launch', 'full_launch', 'scaling');

-- Create enum for checklist categories
CREATE TYPE public.launch_checklist_category AS ENUM (
  'environment_switch',
  'booking_tests',
  'legal_trust',
  'security',
  'support_readiness',
  'monitoring_alerts',
  'soft_launch',
  'full_launch'
);

-- Create enum for test booking status
CREATE TYPE public.test_booking_status AS ENUM ('pending', 'running', 'success', 'failed');

-- Create enum for launch alert types
CREATE TYPE public.launch_alert_type AS ENUM (
  'booking_failure',
  'payment_failure',
  'api_outage',
  'fraud_spike',
  'refund_spike',
  'supplier_error',
  'sla_breach'
);

-- Create enum for alert severity
CREATE TYPE public.launch_alert_severity AS ENUM ('info', 'warning', 'critical');

-- =====================================================
-- Production Launch Checklist Table
-- =====================================================
CREATE TABLE public.production_launch_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category public.launch_checklist_category NOT NULL,
  item_key TEXT NOT NULL UNIQUE,
  item_title TEXT NOT NULL,
  item_description TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  is_critical BOOLEAN NOT NULL DEFAULT false,
  verification_notes TEXT,
  evidence_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_launch_checklist ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view launch checklist"
  ON public.production_launch_checklist FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update launch checklist"
  ON public.production_launch_checklist FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Production Test Bookings Table
-- =====================================================
CREATE TABLE public.production_test_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('hotel', 'activity', 'transfer', 'flight')),
  test_status public.test_booking_status NOT NULL DEFAULT 'pending',
  booking_reference TEXT,
  supplier_confirmation TEXT,
  payment_captured BOOLEAN DEFAULT false,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  email_sent BOOLEAN DEFAULT false,
  admin_visible BOOLEAN DEFAULT false,
  my_trips_visible BOOLEAN DEFAULT false,
  error_message TEXT,
  test_details JSONB,
  tested_by UUID REFERENCES auth.users(id),
  tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_test_bookings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view test bookings"
  ON public.production_test_bookings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert test bookings"
  ON public.production_test_bookings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update test bookings"
  ON public.production_test_bookings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Launch Phase Log Table
-- =====================================================
CREATE TABLE public.launch_phase_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase public.launch_phase NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  started_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metrics_snapshot JSONB,
  blockers_at_start JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.launch_phase_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view phase logs"
  ON public.launch_phase_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert phase logs"
  ON public.launch_phase_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update phase logs"
  ON public.launch_phase_log FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Launch Monitoring Alerts Table
-- =====================================================
CREATE TABLE public.launch_monitoring_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type public.launch_alert_type NOT NULL,
  severity public.launch_alert_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.launch_monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view launch alerts"
  ON public.launch_monitoring_alerts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert launch alerts"
  ON public.launch_monitoring_alerts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update launch alerts"
  ON public.launch_monitoring_alerts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Current Launch Status Table (singleton)
-- =====================================================
CREATE TABLE public.launch_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_phase public.launch_phase NOT NULL DEFAULT 'pre_launch',
  phase_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_paused BOOLEAN NOT NULL DEFAULT false,
  pause_reason TEXT,
  paused_at TIMESTAMPTZ,
  paused_by UUID REFERENCES auth.users(id),
  go_live_date TIMESTAMPTZ,
  soft_launch_started_at TIMESTAMPTZ,
  full_launch_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.launch_status ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view launch status"
  ON public.launch_status FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update launch status"
  ON public.launch_status FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- Seed Default Checklist Items
-- =====================================================

-- Category A: Environment Switch (8 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('environment_switch', 'env_hotelbeds_live', 'Hotelbeds Hotels API → LIVE', 'Verify Hotelbeds Hotels API is using production credentials', true, 1),
('environment_switch', 'env_hotelbeds_activities_live', 'Hotelbeds Activities API → LIVE', 'Verify Hotelbeds Activities API is using production credentials', true, 2),
('environment_switch', 'env_hotelbeds_transfers_live', 'Hotelbeds Transfers API → LIVE', 'Verify Hotelbeds Transfers API is using production credentials', true, 3),
('environment_switch', 'env_stripe_live', 'Stripe → LIVE mode', 'Verify Stripe is configured for live payments (STRIPE_MODE=live)', true, 4),
('environment_switch', 'env_duffel_live', 'Duffel Flights API → LIVE', 'Verify Duffel API is using live credentials (DUFFEL_MODE=live)', true, 5),
('environment_switch', 'env_email_live', 'Email Provider → LIVE', 'Verify Resend is using production domain and API key', true, 6),
('environment_switch', 'env_test_banners_disabled', 'Test banners disabled', 'Verify SHOW_TEST_BADGE=false and no sandbox UI elements visible', true, 7),
('environment_switch', 'env_debug_logs_disabled', 'Debug logging disabled', 'Verify no sensitive console logging in production build', false, 8);

-- Category B: Booking Tests (8 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('booking_tests', 'test_hotel_booking', 'Hotel booking verified', 'Complete a real low-value hotel booking end-to-end', true, 1),
('booking_tests', 'test_activity_booking', 'Activity booking verified', 'Complete a real low-value activity booking end-to-end', true, 2),
('booking_tests', 'test_transfer_booking', 'Transfer booking verified', 'Complete a real low-value transfer booking end-to-end', true, 3),
('booking_tests', 'test_payment_success', 'Payment capture confirmed', 'Verify Stripe payment was captured successfully', true, 4),
('booking_tests', 'test_supplier_confirmation', 'Supplier confirmation received', 'Verify supplier returned booking confirmation', true, 5),
('booking_tests', 'test_email_delivery', 'Confirmation email delivered', 'Verify booking confirmation email was sent and received', true, 6),
('booking_tests', 'test_my_trips_display', 'My Trips shows booking', 'Verify booking appears correctly in customer My Trips page', true, 7),
('booking_tests', 'test_admin_visibility', 'Admin can see booking', 'Verify booking appears in admin dashboard with all details', true, 8);

-- Category C: Legal & Trust (6 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('legal_trust', 'legal_terms_published', 'Terms of Service published', 'Verify Terms of Service page is accessible at /terms', true, 1),
('legal_trust', 'legal_privacy_published', 'Privacy Policy published', 'Verify Privacy Policy page is accessible at /privacy', true, 2),
('legal_trust', 'legal_refund_policy', 'Refund & Cancellation Policy published', 'Verify refund policy is clearly displayed during checkout', true, 3),
('legal_trust', 'legal_company_name', 'Company legal name visible', 'Verify legal company name appears in footer and legal pages', true, 4),
('legal_trust', 'legal_support_email', 'Support email displayed', 'Verify support contact email is visible on site', true, 5),
('legal_trust', 'legal_partner_disclosure', 'Partner disclosure visible', 'Verify "ZIVO is a booking platform. Fulfilled by licensed providers." disclosure', true, 6);

-- Category D: Security (5 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('security', 'sec_https_enforced', 'HTTPS enforced', 'Verify all traffic is served over HTTPS with valid certificate', true, 1),
('security', 'sec_rate_limits', 'Rate limits active', 'Verify API rate limiting is configured and enforced', true, 2),
('security', 'sec_admin_protected', 'Admin routes protected', 'Verify admin routes require authentication and admin role', true, 3),
('security', 'sec_api_keys_env', 'API keys in env only', 'Verify no API keys are hardcoded in frontend code', true, 4),
('security', 'sec_backups_enabled', 'Backups enabled', 'Verify database backups are configured and running', true, 5);

-- Category E: Support Readiness (4 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('support_readiness', 'support_inbox_active', 'Support inbox active', 'Verify support email inbox is monitored and receiving mail', true, 1),
('support_readiness', 'support_auto_replies', 'Auto-replies enabled', 'Verify automatic acknowledgment emails are configured', false, 2),
('support_readiness', 'support_sla_timers', 'SLA timers active', 'Verify support SLA tracking is enabled', false, 3),
('support_readiness', 'support_escalation', 'Escalation contacts set', 'Verify admin escalation contacts are configured', true, 4);

-- Category F: Monitoring & Alerts (5 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('monitoring_alerts', 'monitor_booking_failures', 'Booking failure alerts enabled', 'Verify alerts trigger on booking failures', true, 1),
('monitoring_alerts', 'monitor_payment_failures', 'Payment failure alerts enabled', 'Verify alerts trigger on payment failures', true, 2),
('monitoring_alerts', 'monitor_api_health', 'Supplier API monitoring active', 'Verify API health checks and outage detection', true, 3),
('monitoring_alerts', 'monitor_fraud_detection', 'Fraud detection active', 'Verify fraud scoring and alerting is operational', true, 4),
('monitoring_alerts', 'monitor_refund_alerts', 'High refund rate alerts enabled', 'Verify alerts for unusual refund patterns', false, 5);

-- Category G: Soft Launch (3 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('soft_launch', 'soft_phase_defined', 'Soft launch phase defined (24-72h)', 'Document soft launch duration and success criteria', true, 1),
('soft_launch', 'soft_traffic_controls', 'Traffic controls ready', 'Verify ability to limit traffic if needed', false, 2),
('soft_launch', 'soft_monitoring_ready', 'Monitoring dashboard accessible', 'Verify real-time monitoring is available', true, 3);

-- Category H: Full Launch (3 items)
INSERT INTO public.production_launch_checklist (category, item_key, item_title, item_description, is_critical, sort_order) VALUES
('full_launch', 'full_ads_ready', 'Paid ads ready to enable', 'Verify Google Ads and other paid channels are configured', false, 1),
('full_launch', 'full_seo_published', 'SEO pages published', 'Verify all SEO landing pages are live and indexed', false, 2),
('full_launch', 'full_announcement', 'Public announcement prepared', 'Draft public launch announcement ready', false, 3);

-- =====================================================
-- Seed Initial Launch Status
-- =====================================================
INSERT INTO public.launch_status (current_phase, phase_started_at) VALUES ('pre_launch', now());

-- =====================================================
-- Seed Initial Phase Log
-- =====================================================
INSERT INTO public.launch_phase_log (phase, notes) VALUES ('pre_launch', 'Initial system setup - Pre-launch verification phase started');

-- =====================================================
-- Create Updated At Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_production_launch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_launch_checklist_updated_at
  BEFORE UPDATE ON public.production_launch_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_production_launch_updated_at();

CREATE TRIGGER update_launch_status_updated_at
  BEFORE UPDATE ON public.launch_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_production_launch_updated_at();

-- =====================================================
-- Create Indexes for Performance
-- =====================================================
CREATE INDEX idx_launch_checklist_category ON public.production_launch_checklist(category);
CREATE INDEX idx_launch_checklist_verified ON public.production_launch_checklist(is_verified);
CREATE INDEX idx_test_bookings_status ON public.production_test_bookings(test_status);
CREATE INDEX idx_launch_alerts_severity ON public.launch_monitoring_alerts(severity);
CREATE INDEX idx_launch_alerts_acknowledged ON public.launch_monitoring_alerts(is_acknowledged);
CREATE INDEX idx_phase_log_phase ON public.launch_phase_log(phase);