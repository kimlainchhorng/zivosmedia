-- 1) Close out stale "live" streams from the same host: only keep the most recent one per user
WITH ranked AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at DESC NULLS LAST) AS rn
  FROM public.live_streams
  WHERE status = 'live'
)
UPDATE public.live_streams ls
SET status = 'ended', ended_at = COALESCE(ls.ended_at, now())
FROM ranked
WHERE ls.id = ranked.id AND ranked.rn > 1;

-- 2) Trigger: when a new live stream is inserted (or set to live), auto-end any prior "live" streams for the same user.
CREATE OR REPLACE FUNCTION public.end_previous_live_streams()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'live' THEN
    UPDATE public.live_streams
    SET status = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND status = 'live';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_end_previous_live_streams_ins ON public.live_streams;
CREATE TRIGGER trg_end_previous_live_streams_ins
AFTER INSERT ON public.live_streams
FOR EACH ROW
WHEN (NEW.status = 'live')
EXECUTE FUNCTION public.end_previous_live_streams();

DROP TRIGGER IF EXISTS trg_end_previous_live_streams_upd ON public.live_streams;
CREATE TRIGGER trg_end_previous_live_streams_upd
AFTER UPDATE OF status ON public.live_streams
FOR EACH ROW
WHEN (NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live')
EXECUTE FUNCTION public.end_previous_live_streams();