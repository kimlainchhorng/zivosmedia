-- Real backend-backed trending endpoints for /trending.
-- These functions expose only public ranking fields and avoid client-side mock
-- fallbacks or schema-cache relationship assumptions.

DROP FUNCTION IF EXISTS public.get_trending_posts(integer);
DROP FUNCTION IF EXISTS public.get_trending_hashtags(integer);
DROP FUNCTION IF EXISTS public.get_trending_people(integer);
DROP FUNCTION IF EXISTS public.get_trending_communities(integer);

CREATE OR REPLACE FUNCTION public.get_trending_posts(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id text,
  raw_id uuid,
  source text,
  caption text,
  media_urls text[],
  media_type text,
  likes_count integer,
  comments_count integer,
  views_count integer,
  created_at timestamptz,
  author_name text,
  author_avatar text,
  author_id uuid,
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      'user-' || up.id::text AS id,
      up.id AS raw_id,
      'user'::text AS source,
      up.caption,
      COALESCE(up.media_urls, CASE WHEN up.media_url IS NOT NULL THEN ARRAY[up.media_url] ELSE ARRAY[]::text[] END) AS media_urls,
      up.media_type,
      COALESCE(up.likes_count, 0)::integer AS likes_count,
      COALESCE(up.comments_count, 0)::integer AS comments_count,
      COALESCE(up.views_count, 0)::integer AS views_count,
      up.created_at,
      COALESCE(NULLIF(p.full_name, ''), p.username, 'Creator') AS author_name,
      p.avatar_url AS author_avatar,
      up.user_id AS author_id,
      COALESCE(p.is_verified, false) AS is_verified,
      (COALESCE(up.likes_count, 0) * 3)
        + (COALESCE(up.comments_count, 0) * 6)
        + (COALESCE(up.views_count, 0) / 40.0)
        + GREATEST(0, 72 - EXTRACT(EPOCH FROM (now() - COALESCE(up.created_at, now()))) / 3600.0) AS score
    FROM public.user_posts up
    LEFT JOIN public.profiles p ON p.user_id = up.user_id OR p.id = up.user_id
    WHERE COALESCE(up.is_published, true) = true
      AND COALESCE(up.visibility, 'public') = 'public'
      AND up.hidden_at IS NULL
      AND (NULLIF(trim(COALESCE(up.caption, '')), '') IS NOT NULL OR COALESCE(array_length(up.media_urls, 1), 0) > 0 OR up.media_url IS NOT NULL)

    UNION ALL

    SELECT
      'store-' || spost.id::text AS id,
      spost.id AS raw_id,
      'store'::text AS source,
      spost.caption,
      COALESCE(spost.media_urls, ARRAY[]::text[]) AS media_urls,
      spost.media_type,
      COALESCE(spost.likes_count, 0)::integer AS likes_count,
      COALESCE(spost.comments_count, 0)::integer AS comments_count,
      COALESCE(spost.view_count, 0)::integer AS views_count,
      spost.created_at,
      COALESCE(NULLIF(store.name, ''), 'Business') AS author_name,
      store.logo_url AS author_avatar,
      spost.store_id AS author_id,
      COALESCE(store.is_verified, false) AS is_verified,
      (COALESCE(spost.likes_count, 0) * 3)
        + (COALESCE(spost.comments_count, 0) * 6)
        + (COALESCE(spost.view_count, 0) / 40.0)
        + GREATEST(0, 72 - EXTRACT(EPOCH FROM (now() - spost.created_at)) / 3600.0) AS score
    FROM public.store_posts spost
    LEFT JOIN public.store_profiles store ON store.id = spost.store_id
    WHERE spost.is_published = true
      AND (NULLIF(trim(COALESCE(spost.caption, '')), '') IS NOT NULL OR COALESCE(array_length(spost.media_urls, 1), 0) > 0)
  )
  SELECT
    ranked.id,
    ranked.raw_id,
    ranked.source,
    ranked.caption,
    ranked.media_urls,
    ranked.media_type,
    ranked.likes_count,
    ranked.comments_count,
    ranked.views_count,
    ranked.created_at,
    ranked.author_name,
    ranked.author_avatar,
    ranked.author_id,
    ranked.is_verified
  FROM ranked
  ORDER BY ranked.score DESC, ranked.created_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_trending_hashtags(p_limit integer DEFAULT 30)
RETURNS TABLE (
  tag text,
  count integer,
  likes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH captions AS (
    SELECT up.caption, COALESCE(up.likes_count, 0)::integer AS likes
    FROM public.user_posts up
    WHERE COALESCE(up.is_published, true) = true
      AND COALESCE(up.visibility, 'public') = 'public'
      AND up.hidden_at IS NULL
      AND up.caption IS NOT NULL
    UNION ALL
    SELECT spost.caption, COALESCE(spost.likes_count, 0)::integer AS likes
    FROM public.store_posts spost
    WHERE spost.is_published = true
      AND spost.caption IS NOT NULL
  ),
  tags AS (
    SELECT lower(matches.tag_match[1]) AS tag, captions.likes
    FROM captions
    CROSS JOIN LATERAL regexp_matches(captions.caption, '(#[[:alnum:]_]+)', 'g') AS matches(tag_match)
  )
  SELECT tag, COUNT(*)::integer AS count, COALESCE(SUM(likes), 0)::integer AS likes
  FROM tags
  GROUP BY tag
  ORDER BY (COUNT(*) * 10 + COALESCE(SUM(likes), 0)) DESC, tag ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_trending_people(p_limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  is_verified boolean,
  follower_count integer,
  posts_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    COALESCE(NULLIF(p.full_name, ''), p.username, 'Creator') AS full_name,
    p.avatar_url,
    p.bio,
    COALESCE(p.is_verified, false) AS is_verified,
    COALESCE(f.followers, 0)::integer AS follower_count,
    COALESCE(posts.posts_count, 0)::integer AS posts_count
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS followers
    FROM public.user_followers uf
    WHERE uf.following_id = COALESCE(p.user_id, p.id)
  ) f ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS posts_count
    FROM public.user_posts up
    WHERE up.user_id = COALESCE(p.user_id, p.id)
      AND COALESCE(up.is_published, true) = true
      AND COALESCE(up.visibility, 'public') = 'public'
      AND up.hidden_at IS NULL
  ) posts ON true
  WHERE COALESCE(p.is_private, false) = false
    AND COALESCE(p.is_bot, false) = false
    AND COALESCE(p.profile_visibility, 'public') = 'public'
    AND (p.user_id IS NOT NULL OR p.id IS NOT NULL)
    AND (COALESCE(f.followers, 0) > 0 OR COALESCE(posts.posts_count, 0) > 0 OR COALESCE(p.is_verified, false) = true)
  ORDER BY COALESCE(f.followers, 0) DESC, COALESCE(posts.posts_count, 0) DESC, p.updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_trending_communities(p_limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  avatar_url text,
  member_count integer,
  is_verified boolean,
  category text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.avatar_url,
    COALESCE(c.member_count, 0)::integer AS member_count,
    COALESCE(c.is_verified, false) AS is_verified,
    c.category
  FROM public.communities c
  WHERE COALESCE(c.privacy, 'public') = 'public'
  ORDER BY COALESCE(c.member_count, 0) DESC, COALESCE(c.post_count, 0) DESC, c.updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_posts(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_hashtags(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_people(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_communities(integer) TO anon, authenticated;
