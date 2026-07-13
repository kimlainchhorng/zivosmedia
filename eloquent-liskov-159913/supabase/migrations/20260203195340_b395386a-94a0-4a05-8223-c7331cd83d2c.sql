-- =============================================
-- ZIVO COMPLIANCE & REGULATORY READINESS
-- =============================================

-- Compliance categories and requirements
CREATE TABLE public.compliance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual compliance requirements/checklist items
CREATE TABLE public.compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.compliance_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirement_type TEXT NOT NULL DEFAULT 'required', -- required, recommended, optional
  compliance_status TEXT DEFAULT 'pending', -- pending, in_progress, compliant, non_compliant, not_applicable
  evidence_url TEXT,
  evidence_notes TEXT,
  due_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seller of Travel registrations
CREATE TABLE public.seller_of_travel_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  registration_required BOOLEAN DEFAULT false,
  registration_number TEXT,
  registration_status TEXT DEFAULT 'not_required', -- not_required, pending, active, expired, exempt
  application_date DATE,
  approval_date DATE,
  expiry_date DATE,
  renewal_reminder_sent BOOLEAN DEFAULT false,
  legal_opinion_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compliance audit logs
CREATE TABLE public.compliance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quarterly compliance reviews
CREATE TABLE public.compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_period TEXT NOT NULL, -- e.g., "Q1 2026"
  review_type TEXT DEFAULT 'quarterly', -- quarterly, annual, ad_hoc
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_by UUID,
  summary TEXT,
  findings JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data retention policies
CREATE TABLE public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  description TEXT,
  retention_period_days INTEGER NOT NULL,
  legal_basis TEXT,
  is_active BOOLEAN DEFAULT true,
  last_purge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_of_travel_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin full access to compliance_categories" ON public.compliance_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to compliance_requirements" ON public.compliance_requirements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to seller_of_travel_registrations" ON public.seller_of_travel_registrations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to compliance_audit_logs" ON public.compliance_audit_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to compliance_reviews" ON public.compliance_reviews
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access to data_retention_policies" ON public.data_retention_policies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_compliance_requirements_category ON public.compliance_requirements(category_id);
CREATE INDEX idx_compliance_requirements_status ON public.compliance_requirements(compliance_status);
CREATE INDEX idx_seller_of_travel_state ON public.seller_of_travel_registrations(state_code);
CREATE INDEX idx_compliance_audit_logs_requirement ON public.compliance_audit_logs(requirement_id);
CREATE INDEX idx_compliance_reviews_status ON public.compliance_reviews(status);

-- Seed compliance categories
INSERT INTO public.compliance_categories (name, slug, description, priority) VALUES
  ('Travel & OTA Compliance', 'travel-ota', 'Company disclosures, terms, and travel-specific requirements', 1),
  ('Seller of Travel', 'seller-of-travel', 'State/regional travel seller registrations and licenses', 2),
  ('Payment & Financial', 'payment-financial', 'Stripe, banking, chargeback, and refund compliance', 3),
  ('Tax & Fees Disclosure', 'tax-fees', 'Price transparency, tax collection, and reporting', 4),
  ('Privacy & Data Protection', 'privacy-data', 'GDPR, CCPA, data handling, and breach response', 5),
  ('Email & Communications', 'email-comms', 'CAN-SPAM, transactional emails, and sender verification', 6),
  ('Customer Protection', 'customer-protection', 'Booking confirmations, support, and cancellation disclosures', 7),
  ('Record Keeping & Audit', 'record-keeping', 'Data retention, secure storage, and audit trails', 8);

-- Seed initial compliance requirements
INSERT INTO public.compliance_requirements (category_id, title, description, requirement_type, priority) VALUES
  -- Travel & OTA
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Company legal name displayed', 'ZIVO LLC displayed in footer and legal pages', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Business address displayed', 'Physical business address on contact/legal pages', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Contact email displayed', 'support@hizivo.com visible and functional', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Terms of Service published', 'ToS page accessible and up to date', 'required', 4),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Privacy Policy published', 'Privacy policy page accessible and GDPR/CCPA compliant', 'required', 5),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Refund & cancellation policy', 'Clear refund policy on checkout and legal pages', 'required', 6),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'travel-ota'), 'Third-party provider disclosure', 'Disclosure that travel services are fulfilled by licensed providers', 'required', 7),
  
  -- Payment & Financial
  ((SELECT id FROM public.compliance_categories WHERE slug = 'payment-financial'), 'Stripe live account verified', 'Stripe account fully verified and active', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'payment-financial'), 'Business bank account linked', 'Bank account connected for payouts', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'payment-financial'), 'Chargeback monitoring enabled', 'Stripe Radar and chargeback alerts configured', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'payment-financial'), 'Refund policy enforced', 'Automated refund processing per policy', 'required', 4),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'payment-financial'), 'No full card data storage', 'PCI compliance - no raw card data stored', 'required', 5),
  
  -- Tax & Fees
  ((SELECT id FROM public.compliance_categories WHERE slug = 'tax-fees'), 'Total price displayed at checkout', 'All-in pricing shown before payment', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'tax-fees'), 'Taxes & fees breakdown', 'Clear indication of what is included', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'tax-fees'), 'No misleading "from" pricing', 'Accurate price representation', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'tax-fees'), 'Revenue tracking for accounting', 'Proper revenue recording system', 'required', 4),
  
  -- Privacy & Data
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'Privacy Policy page', 'Comprehensive privacy policy published', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'Cookie Policy page', 'Cookie usage disclosed with consent', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'Security page', 'Security practices documented', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'Data request process', 'DSAR process for delete/export requests', 'required', 4),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'GDPR/CCPA consent', 'Proper consent collection mechanisms', 'required', 5),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'Data minimization', 'Only necessary data collected', 'required', 6),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'privacy-data'), 'Breach response plan', 'Documented incident response procedure', 'required', 7),
  
  -- Email & Communications
  ((SELECT id FROM public.compliance_categories WHERE slug = 'email-comms'), 'CAN-SPAM compliant emails', 'Physical address and unsubscribe in marketing emails', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'email-comms'), 'Unsubscribe mechanism', 'One-click unsubscribe for marketing', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'email-comms'), 'Transactional email delivery', 'Booking confirmations always sent', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'email-comms'), 'Sender domain verified', 'SPF/DKIM/DMARC configured', 'required', 4),
  
  -- Customer Protection
  ((SELECT id FROM public.compliance_categories WHERE slug = 'customer-protection'), 'Booking confirmation page', 'Clear confirmation after successful booking', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'customer-protection'), 'Order number displayed', 'Unique reference for all bookings', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'customer-protection'), 'Supplier reference shown', 'Provider booking reference when available', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'customer-protection'), 'Support contact visible', 'Easy access to customer support', 'required', 4),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'customer-protection'), 'Cancellation rules clear', 'Policy shown before and after booking', 'required', 5),
  
  -- Record Keeping
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Order records retained', 'Booking data stored per retention policy', 'required', 1),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Payment records retained', 'Transaction history maintained', 'required', 2),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Refund records retained', 'Refund audit trail preserved', 'required', 3),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Support ticket records', 'Customer interactions logged', 'required', 4),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Fraud decision records', 'Risk decisions documented', 'required', 5),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Secure storage', 'Encrypted data at rest and in transit', 'required', 6),
  ((SELECT id FROM public.compliance_categories WHERE slug = 'record-keeping'), 'Admin-only access', 'Role-based access controls enforced', 'required', 7);

-- Seed Seller of Travel states
INSERT INTO public.seller_of_travel_registrations (state_code, state_name, registration_required, registration_status, notes) VALUES
  ('CA', 'California', true, 'pending', 'California Seller of Travel registration required'),
  ('FL', 'Florida', true, 'pending', 'Florida Seller of Travel registration required'),
  ('WA', 'Washington', true, 'not_required', 'Review if threshold met'),
  ('HI', 'Hawaii', true, 'not_required', 'Travel agency registration may be required'),
  ('IA', 'Iowa', false, 'not_required', 'No Seller of Travel requirement'),
  ('NV', 'Nevada', false, 'not_required', 'No Seller of Travel requirement');

-- Seed data retention policies
INSERT INTO public.data_retention_policies (data_type, description, retention_period_days, legal_basis) VALUES
  ('orders', 'Booking and order records', 2555, 'Tax and legal requirements (7 years)'),
  ('payments', 'Payment transaction records', 2555, 'Financial regulations (7 years)'),
  ('refunds', 'Refund and chargeback records', 2555, 'Financial regulations (7 years)'),
  ('support_tickets', 'Customer support interactions', 1095, 'Customer service records (3 years)'),
  ('fraud_decisions', 'Fraud detection and decisions', 1825, 'Risk management (5 years)'),
  ('audit_logs', 'System audit trails', 2555, 'Compliance requirements (7 years)'),
  ('user_sessions', 'Login and session data', 90, 'Security monitoring (90 days)'),
  ('analytics_events', 'Anonymous usage analytics', 730, 'Business analytics (2 years)');