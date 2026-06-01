-- Profile completion metadata
-- Keeps lightweight quality signals on profiles so the app can prompt users
-- without recalculating profile completeness on every surface.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completion_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_username boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_avatar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_bio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_profile_polished_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_completion_score_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_completion_score_range
  CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100);

CREATE OR REPLACE FUNCTION public.calculate_profile_completion_score(
  _full_name text,
  _username text,
  _avatar_url text,
  _cover_url text,
  _bio text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    (CASE WHEN length(trim(coalesce(_full_name, ''))) > 0 THEN 15 ELSE 0 END) +
    (CASE WHEN length(trim(coalesce(_username, ''))) > 0 THEN 20 ELSE 0 END) +
    (CASE WHEN length(trim(coalesce(_avatar_url, ''))) > 0 THEN 25 ELSE 0 END) +
    (CASE WHEN length(trim(coalesce(_cover_url, ''))) > 0 THEN 20 ELSE 0 END) +
    (CASE WHEN length(trim(coalesce(_bio, ''))) > 0 THEN 20 ELSE 0 END);
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_completion_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_has_username boolean := length(trim(coalesce(NEW.username::text, ''))) > 0;
  v_has_avatar boolean := length(trim(coalesce(NEW.avatar_url, ''))) > 0;
  v_has_cover boolean := length(trim(coalesce(NEW.cover_url, ''))) > 0;
  v_has_bio boolean := length(trim(coalesce(NEW.bio, ''))) > 0;
  v_score integer;
BEGIN
  v_score := public.calculate_profile_completion_score(
    NEW.full_name,
    NEW.username::text,
    NEW.avatar_url,
    NEW.cover_url,
    NEW.bio
  );

  NEW.has_username := v_has_username;
  NEW.has_avatar := v_has_avatar;
  NEW.has_cover := v_has_cover;
  NEW.has_bio := v_has_bio;
  NEW.profile_completion_score := v_score;

  IF TG_OP = 'INSERT'
    OR OLD.profile_completion_score IS DISTINCT FROM v_score
    OR OLD.has_username IS DISTINCT FROM v_has_username
    OR OLD.has_avatar IS DISTINCT FROM v_has_avatar
    OR OLD.has_cover IS DISTINCT FROM v_has_cover
    OR OLD.has_bio IS DISTINCT FROM v_has_bio
  THEN
    NEW.last_profile_polished_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_completion_metadata ON public.profiles;
CREATE TRIGGER trg_sync_profile_completion_metadata
BEFORE INSERT OR UPDATE OF full_name, username, avatar_url, cover_url, bio
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_completion_metadata();

UPDATE public.profiles
SET
  has_username = length(trim(coalesce(username::text, ''))) > 0,
  has_avatar = length(trim(coalesce(avatar_url, ''))) > 0,
  has_cover = length(trim(coalesce(cover_url, ''))) > 0,
  has_bio = length(trim(coalesce(bio, ''))) > 0,
  profile_completion_score = public.calculate_profile_completion_score(
    full_name,
    username::text,
    avatar_url,
    cover_url,
    bio
  ),
  last_profile_polished_at = coalesce(last_profile_polished_at, now());

CREATE INDEX IF NOT EXISTS idx_profiles_completion_score
ON public.profiles (profile_completion_score DESC);

GRANT SELECT (
  profile_completion_score,
  has_username,
  has_avatar,
  has_cover,
  has_bio,
  last_profile_polished_at
) ON public.profiles TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.calculate_profile_completion_score(text, text, text, text, text)
TO authenticated, anon;
