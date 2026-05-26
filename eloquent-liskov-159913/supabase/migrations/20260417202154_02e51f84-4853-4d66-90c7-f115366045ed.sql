-- 1) Heartbeat column on live_streams
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS last_publisher_heartbeat timestamptz;

CREATE INDEX IF NOT EXISTS live_streams_user_status_idx
  ON public.live_streams (user_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS live_stream_signals_stream_idx
  ON public.live_stream_signals (stream_id, created_at DESC);

-- 2) Heartbeat RPC — only the streaming user can ping their own row.
CREATE OR REPLACE FUNCTION public.touch_live_stream_heartbeat(p_stream_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_streams
     SET last_publisher_heartbeat = now()
   WHERE id = p_stream_id
     AND user_id = auth.uid()
     AND status = 'live'
     AND ended_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_live_stream_heartbeat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_live_stream_heartbeat(uuid) TO authenticated;

-- 3) End-live RPC — owner-only, idempotent
CREATE OR REPLACE FUNCTION public.end_live_stream(p_stream_id uuid)
RETURNS public.live_streams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.live_streams;
BEGIN
  UPDATE public.live_streams
     SET status = 'ended',
         ended_at = COALESCE(ended_at, now())
   WHERE id = p_stream_id
     AND user_id = auth.uid()
   RETURNING * INTO row;

  -- Best-effort: tell viewers the broadcast is over
  IF row.id IS NOT NULL THEN
    INSERT INTO public.live_stream_signals (stream_id, from_role, to_role, type, payload)
    VALUES (row.id, 'publisher', 'viewer', 'bye', '{}'::jsonb);
  END IF;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.end_live_stream(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_live_stream(uuid) TO authenticated;

-- 4) Auto-close streams that haven't pinged for >30s.
CREATE OR REPLACE FUNCTION public.expire_stale_live_streams_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH stale AS (
    UPDATE public.live_streams
       SET status = 'ended',
           ended_at = now()
     WHERE user_id = p_user_id
       AND status = 'live'
       AND ended_at IS NULL
       AND COALESCE(last_publisher_heartbeat, started_at, created_at) < (now() - interval '30 seconds')
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM stale;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_live_streams_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_live_streams_for_user(uuid) TO authenticated;

-- 5) Generic cleanup — removes expired pair sessions and old signal rows.
CREATE OR REPLACE FUNCTION public.cleanup_live_artifacts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals integer;
  v_pairs integer;
BEGIN
  WITH d AS (
    DELETE FROM public.live_stream_signals
     WHERE created_at < now() - interval '10 minutes'
    RETURNING 1
  )
  SELECT count(*) INTO v_signals FROM d;

  WITH d AS (
    UPDATE public.live_pair_sessions
       SET status = 'expired'
     WHERE status = 'pending'
       AND expires_at < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_pairs FROM d;

  RETURN jsonb_build_object('signals_deleted', v_signals, 'pairs_expired', v_pairs);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_live_artifacts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_live_artifacts() TO authenticated;