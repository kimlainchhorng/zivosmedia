-- ============ contact_requests ============
CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);
CREATE INDEX idx_contact_requests_to ON public.contact_requests(to_user_id, status);
CREATE INDEX idx_contact_requests_from ON public.contact_requests(from_user_id, status);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own contact requests"
ON public.contact_requests FOR SELECT TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Send contact requests"
ON public.contact_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = from_user_id AND from_user_id <> to_user_id);

CREATE POLICY "Recipient updates request"
ON public.contact_requests FOR UPDATE TO authenticated
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id)
WITH CHECK (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Sender cancels request"
ON public.contact_requests FOR DELETE TO authenticated
USING (auth.uid() = from_user_id);

CREATE TRIGGER trg_contact_requests_updated_at
BEFORE UPDATE ON public.contact_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ nearby_presence ============
CREATE TABLE public.nearby_presence (
  user_id UUID PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geohash TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nearby_geohash ON public.nearby_presence(geohash, expires_at) WHERE is_visible = true;

ALTER TABLE public.nearby_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own presence"
ON public.nearby_presence FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View nearby visible presence"
ON public.nearby_presence FOR SELECT TO authenticated
USING (
  is_visible = true
  AND expires_at > now()
  AND EXISTS (
    SELECT 1 FROM public.nearby_presence me
    WHERE me.user_id = auth.uid()
      AND substring(me.geohash, 1, 5) = substring(nearby_presence.geohash, 1, 5)
  )
);

-- ============ profiles.phone_hash ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON public.profiles(phone_hash) WHERE phone_hash IS NOT NULL;

-- ============ chat_files extras ============
ALTER TABLE public.chat_files ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.chat_files ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE public.chat_files ADD COLUMN IF NOT EXISTS source TEXT; -- 'upload' | 'scan'

-- ============ channel-media bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('channel-media', 'channel-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "channel-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'channel-media');

CREATE POLICY "channel-media owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'channel-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "channel-media owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'channel-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "channel-media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'channel-media' AND auth.uid()::text = (storage.foldername(name))[1]);