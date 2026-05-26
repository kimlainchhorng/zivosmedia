-- Create device tokens table for push notifications
CREATE TABLE public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  app_version TEXT,
  os_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON public.device_tokens(is_active) WHERE is_active = true;

-- Create push notification logs
CREATE TABLE public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_token_id UUID REFERENCES public.device_tokens(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_push_logs_user ON public.push_notification_logs(user_id);
CREATE INDEX idx_push_logs_status ON public.push_notification_logs(status);

-- Create account deletion requests table (Apple/Google requirement)
CREATE TABLE public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX idx_deletion_requests_scheduled ON public.account_deletion_requests(scheduled_for) WHERE status = 'pending';

-- Create mobile app installs tracking
CREATE TABLE public.app_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'pwa')),
  app_version TEXT,
  install_source TEXT, -- app_store, play_store, direct, referral
  referral_code TEXT,
  first_open_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, platform)
);

CREATE INDEX idx_app_installs_user ON public.app_installs(user_id);
CREATE INDEX idx_app_installs_platform ON public.app_installs(platform);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_installs ENABLE ROW LEVEL SECURITY;

-- Device tokens policies
CREATE POLICY "Users can manage their own device tokens"
  ON public.device_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Push notification logs - users see their own
CREATE POLICY "Users can view their own push logs"
  ON public.push_notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert push logs
CREATE POLICY "System can insert push logs"
  ON public.push_notification_logs FOR INSERT
  WITH CHECK (true);

-- Account deletion policies
CREATE POLICY "Users can manage their deletion requests"
  ON public.account_deletion_requests FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- App installs - users see their own
CREATE POLICY "Users can view their installs"
  ON public.app_installs FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert app installs
CREATE POLICY "System can insert app installs"
  ON public.app_installs FOR INSERT
  WITH CHECK (true);