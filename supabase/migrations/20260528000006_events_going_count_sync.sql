-- events.going_count + trigger that mirrors community_members_sync_count
-- ----------------------------------------------------------------------
-- EventRSVPCard renders event.going_count, EventsHubPage was selecting only
-- the rest of the fields, and there was no column to populate. Add it,
-- sync on every RSVP insert/update/delete, and backfill the existing rows.
-- "going_count" counts rsvps where status='going'; "maybe" and "declined"
-- are tracked but not surfaced as the headline attendee number.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS going_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.event_rsvps_sync_going_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'going' THEN
      UPDATE public.events
      SET going_count = COALESCE(going_count, 0) + 1
      WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'going' THEN
      UPDATE public.events
      SET going_count = GREATEST(COALESCE(going_count, 0) - 1, 0)
      WHERE id = OLD.event_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only the going/non-going transition changes the count.
    IF OLD.status = 'going' AND NEW.status <> 'going' THEN
      UPDATE public.events
      SET going_count = GREATEST(COALESCE(going_count, 0) - 1, 0)
      WHERE id = NEW.event_id;
    ELSIF OLD.status <> 'going' AND NEW.status = 'going' THEN
      UPDATE public.events
      SET going_count = COALESCE(going_count, 0) + 1
      WHERE id = NEW.event_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS event_rsvps_sync_going_count_ins ON public.event_rsvps;
CREATE TRIGGER event_rsvps_sync_going_count_ins
  AFTER INSERT ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.event_rsvps_sync_going_count();

DROP TRIGGER IF EXISTS event_rsvps_sync_going_count_upd ON public.event_rsvps;
CREATE TRIGGER event_rsvps_sync_going_count_upd
  AFTER UPDATE OF status ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.event_rsvps_sync_going_count();

DROP TRIGGER IF EXISTS event_rsvps_sync_going_count_del ON public.event_rsvps;
CREATE TRIGGER event_rsvps_sync_going_count_del
  AFTER DELETE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.event_rsvps_sync_going_count();

-- One-time backfill: count current 'going' RSVPs per event.
UPDATE public.events e
SET going_count = sub.cnt
FROM (
  SELECT event_id, count(*)::int AS cnt
  FROM public.event_rsvps
  WHERE status = 'going'
  GROUP BY event_id
) sub
WHERE e.id = sub.event_id
  AND COALESCE(e.going_count, 0) <> sub.cnt;
