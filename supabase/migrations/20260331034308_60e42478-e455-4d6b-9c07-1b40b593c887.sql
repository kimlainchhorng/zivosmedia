-- Table to track app version releases and trigger update notifications
CREATE TABLE public.app_version_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'ios',
  version text NOT NULL,
  store_url text NOT NULL DEFAULT 'https://apps.apple.com/us/app/zivo-customer/id6759480121',
  release_notes text,
  notify_users boolean NOT NULL DEFAULT true,
  notifications_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_version_releases ENABLE ROW LEVEL SECURITY;

-- Only admins can insert/update, public can read
CREATE POLICY "Anyone can read app versions"
  ON public.app_version_releases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage versions"
  ON public.app_version_releases FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));