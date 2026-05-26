-- Create policy_consents table (needed for functions)
CREATE TABLE IF NOT EXISTS public.policy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('terms', 'privacy', 'cookies', 'seller_of_travel', 'marketing', 'data_sharing')),
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  UNIQUE(user_id, policy_type, policy_version)
);

ALTER TABLE public.policy_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
ON public.policy_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
ON public.policy_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all consents"
ON public.policy_consents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create policy_versions table
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL UNIQUE CHECK (policy_type IN ('terms', 'privacy', 'cookies', 'seller_of_travel', 'marketing', 'data_sharing')),
  current_version TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  content_hash TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view policy versions"
ON public.policy_versions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage policy versions"
ON public.policy_versions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.policy_versions (policy_type, current_version, effective_date) VALUES
  ('terms', '1.0.0', '2024-01-01'),
  ('privacy', '1.0.0', '2024-01-01'),
  ('cookies', '1.0.0', '2024-01-01'),
  ('seller_of_travel', '1.0.0', '2024-01-01'),
  ('marketing', '1.0.0', '2024-01-01'),
  ('data_sharing', '1.0.0', '2024-01-01')
ON CONFLICT (policy_type) DO NOTHING;

-- Now create the helper functions
CREATE OR REPLACE FUNCTION public.has_policy_consent(_user_id UUID, _policy_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.policy_consents pc
    JOIN public.policy_versions pv ON pc.policy_type = pv.policy_type AND pc.policy_version = pv.current_version
    WHERE pc.user_id = _user_id
      AND pc.policy_type = _policy_type
      AND pc.revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.log_pii_access(
  _accessor_id UUID,
  _data_subject_id UUID,
  _data_type TEXT,
  _access_purpose TEXT,
  _access_context TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _accessor_role TEXT;
  _log_id UUID;
BEGIN
  SELECT role::text INTO _accessor_role
  FROM public.user_roles
  WHERE user_id = _accessor_id
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      ELSE 3
    END
  LIMIT 1;
  
  INSERT INTO public.pii_access_logs (accessor_id, accessor_role, data_subject_id, data_type, access_purpose, access_context)
  VALUES (_accessor_id, COALESCE(_accessor_role, 'user'), _data_subject_id, _data_type, _access_purpose, _access_context)
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_policy_consents_user ON public.policy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_consents_type ON public.policy_consents(policy_type);