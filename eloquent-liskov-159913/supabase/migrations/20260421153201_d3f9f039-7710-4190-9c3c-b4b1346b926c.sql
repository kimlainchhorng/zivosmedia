-- Add scheduling + auto-winner fields to creatives
ALTER TABLE public.ads_studio_creatives
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_winner_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_winner_picked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ads_creatives_scheduled_at ON public.ads_studio_creatives(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_creatives_auto_winner_at ON public.ads_studio_creatives(auto_winner_at) WHERE auto_winner_picked = false AND auto_winner_at IS NOT NULL;

-- Publish job queue
CREATE TABLE IF NOT EXISTS public.ads_studio_publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES public.ads_studio_creatives(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google','meta','tiktok','youtube')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  attempts INT NOT NULL DEFAULT 0,
  platform_campaign_id TEXT,
  platform_response JSONB,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_store ON public.ads_studio_publish_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON public.ads_studio_publish_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_creative ON public.ads_studio_publish_jobs(creative_id);

ALTER TABLE public.ads_studio_publish_jobs ENABLE ROW LEVEL SECURITY;

-- Owners + admins can view their store's jobs
CREATE POLICY "publish_jobs_select_owner_admin"
ON public.ads_studio_publish_jobs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_id AND r.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "publish_jobs_insert_owner_admin"
ON public.ads_studio_publish_jobs FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_id AND r.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "publish_jobs_update_owner_admin"
ON public.ads_studio_publish_jobs FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_id AND r.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_publish_jobs_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS publish_jobs_updated_at ON public.ads_studio_publish_jobs;
CREATE TRIGGER publish_jobs_updated_at
BEFORE UPDATE ON public.ads_studio_publish_jobs
FOR EACH ROW EXECUTE FUNCTION public.tg_publish_jobs_set_updated_at();