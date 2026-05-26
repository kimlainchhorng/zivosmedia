-- =============================================
-- ADMIN DASHBOARD COMPREHENSIVE UPGRADE
-- =============================================

-- 1. PAYOUTS & TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method TEXT DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'paypal', 'stripe', 'manual')),
  reference_id TEXT,
  notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TRANSACTIONS LOG (for all financial activity)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  food_order_id UUID REFERENCES public.food_orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('payment', 'payout', 'refund', 'commission', 'tip', 'bonus', 'adjustment')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  payment_method TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'promo')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'riders', 'drivers', 'restaurants', 'admins')),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'payment', 'trip', 'order', 'account', 'technical', 'complaint', 'feedback')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TICKET REPLIES
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  is_admin BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PROMOTIONS & COUPONS
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  applicable_services TEXT[] DEFAULT ARRAY['rides', 'food', 'car_rental', 'flights', 'hotels'],
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. PROMOTION USAGE TRACKING
CREATE TABLE IF NOT EXISTS public.promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  food_order_id UUID REFERENCES public.food_orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_usage ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Payouts: Admins full access, drivers/restaurants can view their own
CREATE POLICY "Admins manage payouts" ON public.payouts FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers view own payouts" ON public.payouts FOR SELECT TO authenticated USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
CREATE POLICY "Restaurants view own payouts" ON public.payouts FOR SELECT TO authenticated USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Transactions: Admins full access, users can view their own
CREATE POLICY "Admins manage transactions" ON public.transactions FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Drivers view own transactions" ON public.transactions FOR SELECT TO authenticated USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Audit logs: Admins only
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO public WITH CHECK (true);

-- System settings: Admins manage, public can view public settings
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public view public settings" ON public.system_settings FOR SELECT TO public USING (is_public = true);

-- Announcements: Admins manage, all can view active
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view active announcements" ON public.announcements FOR SELECT TO public USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()));

-- Support tickets: Admins full access, users manage their own
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Ticket replies: Admins full access, ticket owners can view/create
CREATE POLICY "Admins manage replies" ON public.ticket_replies FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own ticket replies" ON public.ticket_replies FOR SELECT TO authenticated USING (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));
CREATE POLICY "Users create replies on own tickets" ON public.ticket_replies FOR INSERT TO authenticated WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()));

-- Promotions: Admins manage, all can view active
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view active promotions" ON public.promotions FOR SELECT TO public USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at >= now()));

-- Promotion usage: Admins full access, users view their own
CREATE POLICY "Admins manage promotion usage" ON public.promotion_usage FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own promotion usage" ON public.promotion_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can use promotions" ON public.promotion_usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_driver ON public.payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_payouts_restaurant ON public.payouts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_driver ON public.transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON public.promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, starts_at, ends_at);

-- Create updated_at triggers
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description, category, is_public) VALUES
  ('platform_name', '"ZIVO"', 'Platform display name', 'branding', true),
  ('commission_rate', '15', 'Platform commission rate (%)', 'finance', false),
  ('min_payout_amount', '25', 'Minimum payout amount ($)', 'finance', false),
  ('payout_schedule', '"weekly"', 'Automatic payout schedule', 'finance', false),
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'system', true),
  ('support_email', '"support@zivo.app"', 'Support contact email', 'contact', true),
  ('driver_signup_bonus', '100', 'New driver signup bonus ($)', 'promotions', false),
  ('referral_bonus', '25', 'Referral bonus amount ($)', 'promotions', false)
ON CONFLICT (key) DO NOTHING;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_ticket_number_trigger
BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();