-- Push Segments table for reusable audience definitions
CREATE TABLE public.push_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL DEFAULT '{}',
  estimated_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Push Campaigns table for broadcast notifications
CREATE TABLE public.push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  segment_id UUID REFERENCES public.push_segments(id) ON DELETE SET NULL,
  target_type TEXT DEFAULT 'segment' CHECK (target_type IN ('segment', 'all', 'test')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  targeted_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Push Delivery Log for per-user tracking
CREATE TABLE public.push_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.push_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error TEXT,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily push limits per user for rate limiting
CREATE TABLE public.push_user_daily_limits (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  push_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Indexes for performance
CREATE INDEX idx_push_segments_active ON public.push_segments(is_active) WHERE is_active = true;
CREATE INDEX idx_push_campaigns_status ON public.push_campaigns(status);
CREATE INDEX idx_push_campaigns_scheduled ON public.push_campaigns(status, send_at) WHERE status = 'scheduled';
CREATE INDEX idx_push_delivery_log_campaign ON public.push_delivery_log(campaign_id);
CREATE INDEX idx_push_delivery_log_user ON public.push_delivery_log(user_id);
CREATE INDEX idx_push_daily_limits_date ON public.push_user_daily_limits(date);

-- Enable RLS
ALTER TABLE public.push_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_user_daily_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_segments (admin only)
CREATE POLICY "Admins can manage push segments"
ON public.push_segments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'operations')
  )
);

-- RLS Policies for push_campaigns (admin only)
CREATE POLICY "Admins can manage push campaigns"
ON public.push_campaigns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'operations')
  )
);

-- RLS Policies for push_delivery_log (admin read-only, service_role write)
CREATE POLICY "Admins can view push delivery logs"
ON public.push_delivery_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'operations')
  )
);

-- RLS Policies for push_user_daily_limits (admin read, service_role write)
CREATE POLICY "Admins can view push daily limits"
ON public.push_user_daily_limits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'operations')
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_push_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_push_segments_updated_at
  BEFORE UPDATE ON public.push_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_push_updated_at();

CREATE TRIGGER update_push_campaigns_updated_at
  BEFORE UPDATE ON public.push_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_push_updated_at();