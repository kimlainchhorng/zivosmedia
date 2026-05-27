-- Create campaign_deliveries table to track individual deliveries to users
CREATE TABLE public.campaign_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_id UUID REFERENCES public.notifications(id),
  promo_code_id UUID REFERENCES public.promo_codes(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'converted')),
  sent_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  conversion_order_id UUID REFERENCES public.food_orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_deliveries_campaign ON public.campaign_deliveries(campaign_id);
CREATE INDEX idx_campaign_deliveries_user ON public.campaign_deliveries(user_id);
CREATE INDEX idx_campaign_deliveries_status ON public.campaign_deliveries(status);

-- Enable RLS
ALTER TABLE public.campaign_deliveries ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all (using user_roles table)
CREATE POLICY "Admin full access on campaign_deliveries"
ON public.campaign_deliveries
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Users can read their own deliveries
CREATE POLICY "Users can read own campaign deliveries"
ON public.campaign_deliveries
FOR SELECT
USING (user_id = auth.uid());

-- Create user_promo_wallet table for storing assigned promo codes per user
CREATE TABLE public.user_promo_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, promo_code_id)
);

CREATE INDEX idx_user_promo_wallet_user ON public.user_promo_wallet(user_id);
CREATE INDEX idx_user_promo_wallet_active ON public.user_promo_wallet(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_promo_wallet ENABLE ROW LEVEL SECURITY;

-- Users can read their own wallet
CREATE POLICY "Users can read own promo wallet"
ON public.user_promo_wallet
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own wallet (for marking as used)
CREATE POLICY "Users can update own promo wallet"
ON public.user_promo_wallet
FOR UPDATE
USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access on user_promo_wallet"
ON public.user_promo_wallet
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Extend marketing_campaigns table with additional columns
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS notification_title TEXT,
ADD COLUMN IF NOT EXISTS notification_body TEXT,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credits_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_criteria JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_city TEXT,
ADD COLUMN IF NOT EXISTS target_restaurant_id UUID,
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id),
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID;