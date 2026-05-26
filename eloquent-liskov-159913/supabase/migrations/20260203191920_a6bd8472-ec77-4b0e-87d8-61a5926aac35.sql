-- Create fraud risk level enum
CREATE TYPE public.fraud_risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create fraud decision enum
CREATE TYPE public.fraud_decision AS ENUM ('allow', 'review', 'block');

-- Create fraud signal type enum
CREATE TYPE public.fraud_signal_type AS ENUM (
  'account_age',
  'email_reputation',
  'geo_mismatch',
  'velocity',
  'payment_failures',
  'stripe_risk',
  'card_mismatch',
  'high_value',
  'chargeback_history',
  'ip_reputation',
  'vpn_detected',
  'device_fingerprint',
  'booking_pattern',
  'cancellation_history'
);

-- Create fraud assessments table
CREATE TABLE public.fraud_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.travel_orders(id) ON DELETE SET NULL,
  user_id UUID,
  session_id TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level public.fraud_risk_level NOT NULL DEFAULT 'low',
  decision public.fraud_decision NOT NULL DEFAULT 'allow',
  reasons TEXT[] DEFAULT '{}',
  signals JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  geo_country TEXT,
  card_country TEXT,
  is_vpn BOOLEAN DEFAULT false,
  stripe_risk_score INTEGER,
  stripe_risk_level TEXT,
  manual_override BOOLEAN DEFAULT false,
  override_by UUID,
  override_at TIMESTAMPTZ,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fraud signals log table (detailed breakdown)
CREATE TABLE public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.fraud_assessments(id) ON DELETE CASCADE,
  signal_type public.fraud_signal_type NOT NULL,
  signal_name TEXT NOT NULL,
  signal_value TEXT,
  weight INTEGER NOT NULL DEFAULT 0,
  contribution INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user fraud profile (aggregate risk data per user)
CREATE TABLE public.user_fraud_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  lifetime_risk_score INTEGER DEFAULT 0,
  total_assessments INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  chargeback_count INTEGER DEFAULT 0,
  refund_count INTEGER DEFAULT 0,
  failed_payment_count INTEGER DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fraud rules configuration table
CREATE TABLE public.fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  signal_type public.fraud_signal_type NOT NULL,
  condition JSONB NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fraud thresholds configuration
CREATE TABLE public.fraud_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.fraud_risk_level NOT NULL UNIQUE,
  min_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  default_decision public.fraud_decision NOT NULL,
  auto_action TEXT,
  notify_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default thresholds
INSERT INTO public.fraud_thresholds (level, min_score, max_score, default_decision, auto_action, notify_admin) VALUES
  ('low', 0, 29, 'allow', NULL, false),
  ('medium', 30, 59, 'review', 'pause_booking', true),
  ('high', 60, 79, 'review', 'delay_verification', true),
  ('critical', 80, 100, 'block', 'cancel_refund', true);

-- Insert default fraud rules
INSERT INTO public.fraud_rules (rule_name, signal_type, condition, weight, description) VALUES
  ('new_account', 'account_age', '{"max_days": 1}', 15, 'Account created within 24 hours'),
  ('young_account', 'account_age', '{"max_days": 7}', 8, 'Account less than 7 days old'),
  ('disposable_email', 'email_reputation', '{"domains": ["tempmail", "guerrilla", "10minute"]}', 25, 'Disposable email domain detected'),
  ('geo_mismatch', 'geo_mismatch', '{"check": true}', 20, 'Login country differs from booking destination'),
  ('high_velocity', 'velocity', '{"max_bookings": 3, "hours": 1}', 30, 'Multiple bookings in short time'),
  ('payment_failures', 'payment_failures', '{"max_attempts": 2}', 25, 'Multiple failed payment attempts'),
  ('high_stripe_risk', 'stripe_risk', '{"level": "elevated"}', 20, 'Stripe elevated risk'),
  ('highest_stripe_risk', 'stripe_risk', '{"level": "highest"}', 40, 'Stripe highest risk'),
  ('card_country_mismatch', 'card_mismatch', '{"check": true}', 15, 'Card country differs from billing country'),
  ('high_value_order', 'high_value', '{"threshold": 2000}', 10, 'Order value exceeds $2000'),
  ('very_high_value', 'high_value', '{"threshold": 5000}', 20, 'Order value exceeds $5000'),
  ('chargeback_history', 'chargeback_history', '{"count": 1}', 50, 'User has previous chargebacks'),
  ('vpn_detected', 'vpn_detected', '{"check": true}', 10, 'VPN or proxy detected'),
  ('multiple_cancellations', 'cancellation_history', '{"count": 3, "days": 30}', 15, 'Multiple cancellations recently'),
  ('luxury_one_night', 'booking_pattern', '{"type": "luxury_single_night"}', 12, 'One-night stay at luxury property');

-- Create indexes
CREATE INDEX idx_fraud_assessments_order ON public.fraud_assessments(order_id);
CREATE INDEX idx_fraud_assessments_user ON public.fraud_assessments(user_id);
CREATE INDEX idx_fraud_assessments_risk ON public.fraud_assessments(risk_level, decision);
CREATE INDEX idx_fraud_assessments_created ON public.fraud_assessments(created_at DESC);
CREATE INDEX idx_fraud_signals_assessment ON public.fraud_signals(assessment_id);
CREATE INDEX idx_user_fraud_profiles_user ON public.user_fraud_profiles(user_id);
CREATE INDEX idx_user_fraud_profiles_blocked ON public.user_fraud_profiles(is_blocked) WHERE is_blocked = true;

-- Enable RLS
ALTER TABLE public.fraud_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fraud_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access for fraud data
CREATE POLICY "Admins can manage fraud assessments"
  ON public.fraud_assessments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage fraud signals"
  ON public.fraud_signals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage fraud profiles"
  ON public.user_fraud_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage fraud rules"
  ON public.fraud_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can read fraud thresholds"
  ON public.fraud_thresholds FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage fraud thresholds"
  ON public.fraud_thresholds FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_fraud_assessments_updated_at
  BEFORE UPDATE ON public.fraud_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_fraud_profiles_updated_at
  BEFORE UPDATE ON public.user_fraud_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fraud_rules_updated_at
  BEFORE UPDATE ON public.fraud_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();