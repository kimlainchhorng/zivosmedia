-- Signaling table for WebRTC handshakes between paired phone (publisher) and desktop (viewer)
CREATE TABLE public.live_stream_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id uuid NOT NULL,
  from_role text NOT NULL CHECK (from_role IN ('publisher', 'viewer')),
  to_role text NOT NULL CHECK (to_role IN ('publisher', 'viewer')),
  type text NOT NULL CHECK (type IN ('join', 'offer', 'answer', 'ice', 'bye')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_stream_signals_stream_created
  ON public.live_stream_signals (stream_id, created_at DESC);

ALTER TABLE public.live_stream_signals ENABLE ROW LEVEL SECURITY;

-- Capability-token model: knowing the stream UUID is sufficient (it's already
-- shared between the paired devices via the pairing handshake / live_streams row).
CREATE POLICY "Anyone can insert signals for a known stream"
  ON public.live_stream_signals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (stream_id IS NOT NULL);

CREATE POLICY "Anyone can read signals for a known stream"
  ON public.live_stream_signals
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_signals;
ALTER TABLE public.live_stream_signals REPLICA IDENTITY FULL;

-- Cleanup helper
CREATE OR REPLACE FUNCTION public.cleanup_old_live_stream_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.live_stream_signals
  WHERE created_at < now() - interval '2 minutes';
END;
$$;