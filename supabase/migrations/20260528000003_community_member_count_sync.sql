-- Keep communities.member_count in sync with community_members
-- ------------------------------------------------------------
-- Mirrors the ppv_unlocks_after_insert pattern. Without this trigger, joins
-- and leaves never update the cached count, so the discover list ranks
-- communities by a stale field forever.

CREATE OR REPLACE FUNCTION public.community_members_sync_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities
    SET member_count = COALESCE(member_count, 0) + 1
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities
    SET member_count = GREATEST(COALESCE(member_count, 0) - 1, 0)
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_members_sync_count_insert ON public.community_members;
CREATE TRIGGER community_members_sync_count_insert
  AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.community_members_sync_count();

DROP TRIGGER IF EXISTS community_members_sync_count_delete ON public.community_members;
CREATE TRIGGER community_members_sync_count_delete
  AFTER DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.community_members_sync_count();

-- One-time backfill so any pre-existing members are reflected in the cached
-- count. Safe to re-run.
UPDATE public.communities c
SET member_count = sub.cnt
FROM (
  SELECT community_id, count(*)::int AS cnt
  FROM public.community_members
  GROUP BY community_id
) sub
WHERE c.id = sub.community_id
  AND COALESCE(c.member_count, 0) <> sub.cnt;
