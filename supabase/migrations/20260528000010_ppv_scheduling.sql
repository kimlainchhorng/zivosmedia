-- PPV scheduling — let creators batch content and drop it on a schedule.
-- A scheduled post stays hidden from fans until scheduled_for <= now().
-- No cron required — visibility flips naturally as time advances.

ALTER TABLE public.ppv_posts
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS ppv_posts_scheduled_idx
  ON public.ppv_posts(scheduled_for)
  WHERE scheduled_for IS NOT NULL;

-- Replace the public read policy so scheduled-future posts are hidden from
-- non-owners. Owners still see everything via ppv_posts_owner_all.
DROP POLICY IF EXISTS "ppv_posts_read_published" ON public.ppv_posts;
CREATE POLICY "ppv_posts_read_published" ON public.ppv_posts
  FOR SELECT USING (
    is_published = true
    AND (scheduled_for IS NULL OR scheduled_for <= now())
  );
