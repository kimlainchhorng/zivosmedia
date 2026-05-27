-- Marketing Segments
CREATE TABLE public.marketing_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  member_count INTEGER NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_segments_store ON public.marketing_segments(store_id);
ALTER TABLE public.marketing_segments ENABLE ROW LEVEL SECURITY;

-- Marketing Templates
CREATE TABLE public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  preview_image_url TEXT,
  variables_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_campaign_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_templates_store ON public.marketing_templates(store_id);
CREATE INDEX idx_marketing_templates_channel ON public.marketing_templates(store_id, channel);
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

-- Marketing Automations
CREATE TABLE public.marketing_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_automations_store ON public.marketing_automations(store_id);
ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

-- Marketing Promo Codes
CREATE TABLE public.marketing_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'percent',
  value NUMERIC NOT NULL DEFAULT 0,
  min_order_cents INTEGER NOT NULL DEFAULT 0,
  max_redemptions INTEGER,
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  campaign_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);
CREATE INDEX idx_marketing_promo_codes_store ON public.marketing_promo_codes(store_id);
CREATE INDEX idx_marketing_promo_codes_campaign ON public.marketing_promo_codes(campaign_id);
ALTER TABLE public.marketing_promo_codes ENABLE ROW LEVEL SECURITY;

-- Marketing Campaign Events
CREATE TABLE public.marketing_campaign_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  store_id UUID NOT NULL,
  user_id UUID,
  channel TEXT,
  event_type TEXT NOT NULL,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mce_campaign ON public.marketing_campaign_events(campaign_id);
CREATE INDEX idx_mce_store_created ON public.marketing_campaign_events(store_id, created_at DESC);
CREATE INDEX idx_mce_event_type ON public.marketing_campaign_events(store_id, event_type);
ALTER TABLE public.marketing_campaign_events ENABLE ROW LEVEL SECURITY;

-- Helper: is current user the store owner?
CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _store_id AND owner_id = auth.uid()
  );
$$;

-- Policies: marketing_segments
CREATE POLICY "Owners and admins can view segments" ON public.marketing_segments
  FOR SELECT USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can insert segments" ON public.marketing_segments
  FOR INSERT WITH CHECK (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can update segments" ON public.marketing_segments
  FOR UPDATE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete segments" ON public.marketing_segments
  FOR DELETE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));

-- Policies: marketing_templates
CREATE POLICY "Owners and admins can view templates" ON public.marketing_templates
  FOR SELECT USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can insert templates" ON public.marketing_templates
  FOR INSERT WITH CHECK (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can update templates" ON public.marketing_templates
  FOR UPDATE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete templates" ON public.marketing_templates
  FOR DELETE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));

-- Policies: marketing_automations
CREATE POLICY "Owners and admins can view automations" ON public.marketing_automations
  FOR SELECT USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can insert automations" ON public.marketing_automations
  FOR INSERT WITH CHECK (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can update automations" ON public.marketing_automations
  FOR UPDATE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete automations" ON public.marketing_automations
  FOR DELETE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));

-- Policies: marketing_promo_codes
CREATE POLICY "Owners and admins can view promos" ON public.marketing_promo_codes
  FOR SELECT USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can insert promos" ON public.marketing_promo_codes
  FOR INSERT WITH CHECK (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can update promos" ON public.marketing_promo_codes
  FOR UPDATE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete promos" ON public.marketing_promo_codes
  FOR DELETE USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));

-- Policies: marketing_campaign_events
CREATE POLICY "Owners and admins can view campaign events" ON public.marketing_campaign_events
  FOR SELECT USING (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can insert campaign events" ON public.marketing_campaign_events
  FOR INSERT WITH CHECK (public.is_store_owner(store_id) OR public.has_role(auth.uid(), 'admin'));

-- Timestamp triggers
CREATE TRIGGER trg_marketing_segments_updated BEFORE UPDATE ON public.marketing_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_templates_updated BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_automations_updated BEFORE UPDATE ON public.marketing_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_promo_codes_updated BEFORE UPDATE ON public.marketing_promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();