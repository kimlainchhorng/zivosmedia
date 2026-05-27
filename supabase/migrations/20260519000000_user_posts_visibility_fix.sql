-- Fix: feed not showing other users' posts.
--
-- Three policies had accumulated on public.user_posts over time:
--   1. "Published user posts are visible"        (2026-03-30 — public + owner)
--   2. "View posts by visibility"                (2026-04-29 — visibility-aware)
--   3. "Authenticated view published posts"      (2026-05-03 — TO authenticated only)
--
-- Postgres ORs PERMISSIVE policies, so on paper all three would allow visibility.
-- But policy 3's introduction of `TO authenticated` combined with the
-- April-29 DROP IF EXISTS that targeted the wrong name (the original policy
-- had already been renamed) left ambiguity about which policy actually wins
-- in production. Reports of "I can only see my own posts" suggest the
-- visibility check is silently filtering more than intended.
--
-- This migration replaces all three with one canonical, explicit policy
-- that handles every visibility tier the product supports.

-- Drop every known prior policy name (idempotent).
DROP POLICY IF EXISTS "Published user posts are visible"   ON public.user_posts;
DROP POLICY IF EXISTS "View posts by visibility"           ON public.user_posts;
DROP POLICY IF EXISTS "Authenticated view published posts" ON public.user_posts;
DROP POLICY IF EXISTS "Anyone can view published posts"    ON public.user_posts;

-- One unified SELECT policy.
-- A row is visible when:
--   • You are the author (always — even if unpublished/onlyme), OR
--   • The post is published AND visibility = 'everyone' (public feed), OR
--   • The post is published AND visibility = 'friends'  AND you follow the author,
--   • The post is published AND visibility IS NULL      (legacy rows default to public).
--
-- Not scoped TO authenticated — anonymous web visitors can still see public
-- posts (matches the marketing/site behavior expected from /feed).
CREATE POLICY "Posts visible by visibility"
  ON public.user_posts
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      is_published = true
      AND (
        visibility IS NULL
        OR visibility = 'everyone'
        OR (
          visibility = 'friends'
          AND auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.user_followers
            WHERE follower_id = auth.uid()
              AND following_id = user_posts.user_id
          )
        )
      )
    )
  );

-- Sanity log so deploy logs make the intent obvious.
DO $$
BEGIN
  RAISE NOTICE 'user_posts SELECT policies consolidated to single "Posts visible by visibility"';
END $$;
