-- Speed up signal polling and active-stream lookups
CREATE INDEX IF NOT EXISTS idx_live_stream_signals_stream_created
  ON public.live_stream_signals (stream_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_stream_signals_to_role
  ON public.live_stream_signals (stream_id, to_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_streams_status_started
  ON public.live_streams (status, started_at DESC)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_live_streams_user_status
  ON public.live_streams (user_id, status)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_live_pair_sessions_token
  ON public.live_pair_sessions (token)
  WHERE status = 'confirmed' AND revoked_at IS NULL;