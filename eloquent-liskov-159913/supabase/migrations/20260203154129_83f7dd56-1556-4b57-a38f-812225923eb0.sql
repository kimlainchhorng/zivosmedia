-- STEP 2: RLS, Indexes, Triggers, and Data

-- Enable RLS on all tables
ALTER TABLE public.legal_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_of_travel_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "lp_anyone_read" ON public.legal_policies FOR SELECT USING (is_active = true);
CREATE POLICY "lp_admin_all" ON public.legal_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ucl_user_read" ON public.user_consent_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ucl_user_insert" ON public.user_consent_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ucl_admin_read" ON public.user_consent_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rt_anyone_read" ON public.role_terms FOR SELECT USING (is_active = true);
CREATE POLICY "rt_admin_all" ON public.role_terms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rta_user_read" ON public.role_terms_acceptance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "rta_user_insert" ON public.role_terms_acceptance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "rta_admin_read" ON public.role_terms_acceptance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sot_anyone_read" ON public.seller_of_travel_status FOR SELECT USING (true);
CREATE POLICY "sot_admin_all" ON public.seller_of_travel_status FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ld_user_read" ON public.legal_disputes FOR SELECT TO authenticated USING (complainant_id = auth.uid() OR respondent_id = auth.uid());
CREATE POLICY "ld_user_insert" ON public.legal_disputes FOR INSERT TO authenticated WITH CHECK (complainant_id = auth.uid());
CREATE POLICY "ld_admin_all" ON public.legal_disputes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "lal_admin_read" ON public.legal_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lal_insert" ON public.legal_audit_log FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lp_type ON public.legal_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_lp_active ON public.legal_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_ucl_user ON public.user_consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ucl_policy ON public.user_consent_logs(policy_type, policy_version);
CREATE INDEX IF NOT EXISTS idx_rta_user ON public.role_terms_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_ld_status ON public.legal_disputes(status);
CREATE INDEX IF NOT EXISTS idx_lal_action ON public.legal_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_lal_created ON public.legal_audit_log(created_at);

-- Triggers
CREATE TRIGGER update_lp_ts BEFORE UPDATE ON public.legal_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rt_ts BEFORE UPDATE ON public.role_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sot_ts BEFORE UPDATE ON public.seller_of_travel_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ld_ts BEFORE UPDATE ON public.legal_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Legal policies
INSERT INTO public.legal_policies (policy_type, version, title, content, applies_to, is_active) VALUES
('terms', '1.0', 'Terms of Service', 'Master Terms of Service for ZIVO platform.', ARRAY['flights', 'cars', 'rides', 'eats', 'move'], true),
('privacy', '1.0', 'Privacy Policy', 'Privacy Policy governing data collection and use.', ARRAY['flights', 'cars', 'rides', 'eats', 'move'], true),
('seller_of_travel', '1.0', 'Seller of Travel Disclosure', 'Seller of Travel regulatory disclosure.', ARRAY['flights'], true),
('transportation', '1.0', 'Transportation Network Disclaimer', 'TNC disclaimer for rides and move services.', ARRAY['rides', 'move'], true),
('car_rental', '1.0', 'Car Rental Marketplace Disclaimer', 'Car rental marketplace disclaimer.', ARRAY['cars'], true),
('insurance', '1.0', 'Insurance & Protection Disclosure', 'Insurance and protection disclosure.', ARRAY['cars', 'rides'], true),
('refunds', '1.0', 'Payment & Refund Policy', 'Refund and payment policy.', ARRAY['flights', 'cars', 'rides', 'eats', 'move'], true)
ON CONFLICT (policy_type, version) DO NOTHING;

-- Seed data: Role terms
INSERT INTO public.role_terms (role_type, version, title, content, responsibilities, liabilities, is_active) VALUES
('customer', '1.0', 'Customer Terms', 'Customer Terms and Conditions.',
  ARRAY['Provide accurate booking information', 'Make timely payments', 'Follow cancellation policies'],
  ARRAY['Payment for services used', 'Damage caused during rental'], true),
('driver', '1.0', 'Driver Partner Terms', 'Driver Partner Terms.',
  ARRAY['Maintain valid license and insurance', 'Provide safe transportation', 'Follow platform rules'],
  ARRAY['Own vehicle maintenance', 'Own insurance coverage', 'Compliance with local laws'], true),
('car_owner', '1.0', 'Vehicle Owner Terms', 'Vehicle Owner Terms.',
  ARRAY['Maintain vehicle in safe condition', 'Provide accurate vehicle information', 'Maintain insurance coverage'],
  ARRAY['Vehicle condition and safety', 'Insurance coverage', 'Accurate listing information'], true),
('fleet_owner', '1.0', 'Fleet Owner Terms', 'Fleet Owner Terms.',
  ARRAY['Maintain all vehicles', 'Manage driver assignments', 'Ensure compliance'],
  ARRAY['Fleet vehicle conditions', 'Driver compliance', 'Insurance for all vehicles'], true),
('restaurant_partner', '1.0', 'Restaurant Partner Terms', 'Restaurant Partner Terms.',
  ARRAY['Maintain food safety standards', 'Prepare orders accurately', 'Package orders properly'],
  ARRAY['Food quality and safety', 'Accurate menu pricing', 'Health code compliance'], true)
ON CONFLICT (role_type, version) DO NOTHING;

-- Seed data: SOT statuses
INSERT INTO public.seller_of_travel_status (state_code, state_name, status) VALUES
('CA', 'California', 'pending'),
('FL', 'Florida', 'pending'),
('WA', 'Washington', 'not_required'),
('HI', 'Hawaii', 'not_required')
ON CONFLICT (state_code) DO NOTHING;

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_accepted_policy(p_user_id UUID, p_policy_type TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_consent_logs ucl
    JOIN public.legal_policies lp ON lp.policy_type = ucl.policy_type 
      AND lp.version = ucl.policy_version AND lp.is_active = true
    WHERE ucl.user_id = p_user_id AND ucl.policy_type = p_policy_type AND ucl.consent_given = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_policy_version(p_policy_type TEXT)
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT version FROM public.legal_policies WHERE policy_type = p_policy_type AND is_active = true ORDER BY effective_at DESC LIMIT 1;
$$;