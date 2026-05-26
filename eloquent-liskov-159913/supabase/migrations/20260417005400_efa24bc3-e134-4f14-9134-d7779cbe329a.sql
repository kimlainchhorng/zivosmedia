
-- OAuth state (CSRF + return URL during OAuth round-trip)
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  platform public.ad_platform NOT NULL,
  return_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads own state" ON public.oauth_states FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Per-page / per-asset storage (a single Meta connection can manage many FB Pages + IG accounts)
CREATE TABLE public.store_ad_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.store_ad_accounts(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform public.ad_platform NOT NULL,
  page_type text NOT NULL,        -- 'fb_page' | 'ig_account' | 'ad_account'
  external_id text NOT NULL,
  name text,
  picture_url text,
  access_token text,              -- page-scoped token for Meta
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, page_type, external_id)
);
CREATE INDEX idx_store_ad_pages_account ON public.store_ad_pages(account_id);
CREATE INDEX idx_store_ad_pages_store ON public.store_ad_pages(store_id);

ALTER TABLE public.store_ad_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin manage ad pages" ON public.store_ad_pages FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_ad_pages.store_id AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_ad_pages.store_id AND r.owner_id = auth.uid())
  );

-- Token columns on the account record
ALTER TABLE public.store_ad_accounts
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scopes text,
  ADD COLUMN IF NOT EXISTS user_external_id text;
