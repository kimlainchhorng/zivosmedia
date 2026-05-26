-- STEP 1: Create all tables first (no functions)

-- Legal policies
CREATE TABLE IF NOT EXISTS public.legal_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  applies_to TEXT[] DEFAULT '{}',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(policy_type, version)
);

-- User consent logs
CREATE TABLE IF NOT EXISTS public.user_consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  policy_id UUID,
  policy_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_method TEXT NOT NULL DEFAULT 'checkbox',
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role terms
CREATE TABLE IF NOT EXISTS public.role_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  responsibilities TEXT[],
  liabilities TEXT[],
  is_active BOOLEAN DEFAULT true,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_type, version)
);

-- Role terms acceptance
CREATE TABLE IF NOT EXISTS public.role_terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_type TEXT NOT NULL,
  role_terms_id UUID,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE(user_id, role_type, terms_version)
);

-- Seller of travel status
CREATE TABLE IF NOT EXISTS public.seller_of_travel_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,
  registration_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  registration_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  bond_amount DECIMAL(12,2),
  notes TEXT,
  document_url TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legal disputes
CREATE TABLE IF NOT EXISTS public.legal_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_type TEXT NOT NULL,
  service_type TEXT NOT NULL,
  complainant_id UUID,
  complainant_type TEXT,
  respondent_id UUID,
  respondent_type TEXT,
  booking_id TEXT,
  amount_disputed DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolution_amount DECIMAL(12,2),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legal audit log
CREATE TABLE IF NOT EXISTS public.legal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT,
  target_type TEXT,
  target_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);