-- Global stale-live-stream sweeper. Marks any 'live' stream as 'ended' when its
-- publisher heartbeat (or fallback timestamp) is older than 60 seconds.
CREATE OR REPLACE FUNCTION public.expire_all_stale_live_streams()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH stale AS (
    UPDATE public.live_streams
       SET status = 'ended',
           ended_at = now()
     WHERE status = 'live'
       AND ended_at IS NULL
       AND COALESCE(last_publisher_heartbeat, started_at, created_at) < (now() - interval '60 seconds')
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM stale;
  RETURN v_count;
END;
$function$;

-- Allow anon + authenticated to invoke (read-only effect for the caller; safe to run from list page)
GRANT EXECUTE ON FUNCTION public.expire_all_stale_live_streams() TO anon, authenticated;

-- One-shot cleanup: kill the existing ghost row(s) right now
SELECT public.expire_all_stale_live_streams();