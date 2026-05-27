-- Extend trip_shares
ALTER TABLE public.trip_shares
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_shares_token_unique ON public.trip_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_trip_shares_ride ON public.trip_shares(ride_id);

ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ts_select" ON public.trip_shares;
CREATE POLICY "ts_select" ON public.trip_shares FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ts_insert" ON public.trip_shares;
CREATE POLICY "ts_insert" ON public.trip_shares FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "ts_update" ON public.trip_shares;
CREATE POLICY "ts_update" ON public.trip_shares FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- webhook_events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'stripe',
  ride_request_id UUID,
  status TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON public.webhook_events(received_at DESC);

DROP POLICY IF EXISTS "we_admin_select" ON public.webhook_events;
CREATE POLICY "we_admin_select" ON public.webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "drvdoc_insert" ON storage.objects;
CREATE POLICY "drvdoc_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "drvdoc_select" ON storage.objects;
CREATE POLICY "drvdoc_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "drvdoc_update" ON storage.objects;
CREATE POLICY "drvdoc_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "drvdoc_delete" ON storage.objects;
CREATE POLICY "drvdoc_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);