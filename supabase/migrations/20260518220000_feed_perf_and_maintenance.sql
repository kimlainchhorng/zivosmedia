-- =============================================================================
-- Feed & Social Performance Indexes + Maintenance Functions
-- May 2026 — upgrade batch
-- =============================================================================

-- ── user_posts: feed queries almost always filter by (user_id, created_at DESC)
--    and (is_draft, created_at DESC). Add covering indexes if missing.
CREATE INDEX IF NOT EXISTS idx_user_posts_user_created
  ON public.user_posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_posts_public_feed
  ON public.user_posts (created_at DESC)
  WHERE is_draft = FALSE;

-- ── post_comments: frequently queried by post_id, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON public.post_comments (post_id, created_at);

-- ── post_reactions: (post_id, user_id) for quick "did I react?" checks
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_user
  ON public.post_reactions (post_id, user_id);

-- ── notifications: mark-all-read and unread-count use (user_id, is_read, created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = FALSE;

-- ── user_followers: "is X following Y?" requires fast lookup both ways
CREATE INDEX IF NOT EXISTS idx_user_followers_follower
  ON public.user_followers (follower_id, following_id);

CREATE INDEX IF NOT EXISTS idx_user_followers_following
  ON public.user_followers (following_id, follower_id);

-- ── direct_messages: conversation list sorted by most-recent message
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created
  ON public.direct_messages (
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at DESC
  );

-- =============================================================================
-- Automatic notification cleanup — purge read notifications older than 90 days
-- to keep the table lean without manual intervention.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = TRUE
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Grant execute only to postgres (cron job context)
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO postgres;

-- Schedule cleanup to run daily at 03:00 UTC if pg_cron is available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-old-notifications',
      '0 3 * * *',
      $$SELECT public.cleanup_old_notifications();$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not installed — skip silently
  NULL;
END;
$$;

-- =============================================================================
-- Refresh post view counts trigger: use SKIP LOCKED to avoid contention
-- when many concurrent view increments arrive at the same time.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_post_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;
