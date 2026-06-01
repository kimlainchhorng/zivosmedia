-- Restrict live WebRTC signaling writes to the live-signal Edge Function.
-- Realtime SELECT remains policy-controlled so paired devices can receive
-- inserts, but clients must not bypass function auth, pair-token checks,
-- signal rate limits, ICE dedupe, and heartbeat handling.

DROP POLICY IF EXISTS "Authenticated insert signals as host or viewer" ON public.live_stream_signals;
DROP POLICY IF EXISTS "Anyone can insert signals for a known stream" ON public.live_stream_signals;

COMMENT ON TABLE public.live_stream_signals IS
  'WebRTC signaling rows. Inserts are restricted to trusted server-side ingestion via the live-signal Edge Function.';
