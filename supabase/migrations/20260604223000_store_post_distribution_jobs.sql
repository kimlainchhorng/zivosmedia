-- Queue organic social posting and paid boost jobs for store posts.

CREATE TABLE IF NOT EXISTS public.store_post_distribution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.store_posts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'tiktok', 'google_ads', 'x')),
  action text NOT NULL CHECK (action IN ('organic_post', 'boost_ad')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'needs_connection', 'processing', 'published', 'active', 'failed', 'cancelled')),
  daily_budget_cents integer NOT NULL DEFAULT 0,
  total_budget_cents integer NOT NULL DEFAULT 0,
  objective text NOT NULL DEFAULT 'reach',
  audience text NOT NULL DEFAULT 'broad',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  external_id text,
  external_url text,
  error_message text,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, platform, action)
);

CREATE INDEX IF NOT EXISTS idx_store_post_distribution_jobs_store
  ON public.store_post_distribution_jobs(store_id, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_post_distribution_jobs_post
  ON public.store_post_distribution_jobs(post_id, platform, action);

ALTER TABLE public.store_post_distribution_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners manage post distribution jobs" ON public.store_post_distribution_jobs;
CREATE POLICY "Store owners manage post distribution jobs"
  ON public.store_post_distribution_jobs
  FOR ALL
  USING (
    public.is_store_owner(store_id, auth.uid())
    OR public.is_store_owner(store_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_store_owner(store_id, auth.uid())
    OR public.is_store_owner(store_id)
    OR public.has_role(auth.uid(), 'admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_post_distribution_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_post_distribution_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.tg_store_post_distribution_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_post_distribution_jobs_updated_at ON public.store_post_distribution_jobs;
CREATE TRIGGER trg_store_post_distribution_jobs_updated_at
BEFORE UPDATE ON public.store_post_distribution_jobs
FOR EACH ROW EXECUTE FUNCTION public.tg_store_post_distribution_jobs_updated_at();
