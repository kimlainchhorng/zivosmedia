-- =============================================
-- ZIVO Admin Operations - Tables and Functions
-- =============================================

-- 1. Create admin_audit_logs table for detailed admin action tracking
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for admin audit logs
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Policy: Service role can insert audit logs (admin-authenticated insert with validation)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2. Create provider_health table for monitoring API health
CREATE TABLE IF NOT EXISTS public.provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  error_count_24h INTEGER DEFAULT 0,
  success_count_24h INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  last_error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_name)
);

-- Enable RLS on provider_health
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read provider health
DROP POLICY IF EXISTS "Admins can read provider health" ON public.provider_health;
CREATE POLICY "Admins can read provider health"
ON public.provider_health
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Add admin_notes column to travel_orders if not exists
ALTER TABLE public.travel_orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.travel_orders ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT false;
ALTER TABLE public.travel_orders ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

-- 4. Create function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin', 'operations', 'finance', 'support')
  )
$$;

-- 5. Insert default provider health record for Hotelbeds
INSERT INTO public.provider_health (provider_name, status)
VALUES ('hotelbeds', 'unknown')
ON CONFLICT (provider_name) DO NOTHING;