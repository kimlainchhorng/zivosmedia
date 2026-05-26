-- 1) store_ad_campaigns: resume drafts + archive
ALTER TABLE public.store_ad_campaigns
  ADD COLUMN IF NOT EXISTS draft_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2) marketing_segments: usage + sync flags
ALTER TABLE public.marketing_segments
  ADD COLUMN IF NOT EXISTS usage_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS synced_to_meta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS synced_to_google boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_audience_ids jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) marketing_automation_enrollments
CREATE TABLE IF NOT EXISTS public.marketing_automation_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_step int NOT NULL DEFAULT 0,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_error text,
  UNIQUE (automation_id, user_id)
);

ALTER TABLE public.marketing_automation_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation enrollments"
  ON public.marketing_automation_enrollments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners view own automation enrollments"
  ON public.marketing_automation_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_automations a
      JOIN public.restaurants r ON r.id = a.store_id
      WHERE a.id = marketing_automation_enrollments.automation_id
        AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users view own enrollments"
  ON public.marketing_automation_enrollments FOR SELECT
  USING (user_id = auth.uid());

-- 4) marketing_promo_redemptions
CREATE TABLE IF NOT EXISTS public.marketing_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.marketing_promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid,
  discount_cents int NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage redemptions"
  ON public.marketing_promo_redemptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own redemptions"
  ON public.marketing_promo_redemptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Store owners view redemptions on their promos"
  ON public.marketing_promo_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketing_promo_codes p
      JOIN public.restaurants r ON r.id = p.store_id
      WHERE p.id = marketing_promo_redemptions.promo_code_id
        AND r.owner_id = auth.uid()
    )
  );

-- 5) marketing_test_sends
CREATE TABLE IF NOT EXISTS public.marketing_test_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  channel text NOT NULL,
  payload_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_by uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_test_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage test sends"
  ON public.marketing_test_sends FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners view own test sends"
  ON public.marketing_test_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = marketing_test_sends.store_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners insert own test sends"
  ON public.marketing_test_sends FOR INSERT
  WITH CHECK (
    sent_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = marketing_test_sends.store_id AND r.owner_id = auth.uid()
    )
  );

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_store_ad_campaigns_store_status
  ON public.store_ad_campaigns (store_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_events_campaign_type_at
  ON public.marketing_campaign_events (campaign_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_automation_enrollments_due
  ON public.marketing_automation_enrollments (automation_id, status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_marketing_promo_redemptions_promo
  ON public.marketing_promo_redemptions (promo_code_id, redeemed_at);