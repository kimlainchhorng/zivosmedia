
-- Service uptime log table to track status transitions
CREATE TABLE public.service_uptime_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_key TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER
);

ALTER TABLE public.service_uptime_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view uptime logs"
ON public.service_uptime_log FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_uptime_log_service ON public.service_uptime_log (service_key, changed_at DESC);

-- System logs table for generalized error/warning logging
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('error', 'warning', 'info')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system logs"
ON public.system_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_system_logs_level ON public.system_logs (level, created_at DESC);
CREATE INDEX idx_system_logs_source ON public.system_logs (source, created_at DESC);
