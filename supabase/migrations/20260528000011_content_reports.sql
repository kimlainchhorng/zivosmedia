-- Generic content reports — polymorphic table covering PPV posts, paid DMs,
-- and any future content types. Reporters insert; admins read & resolve.
--
-- Distinct from chat_message_reports (chat-specific). Reporters can choose
-- from a small predefined reason set and add a free-text description.

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('ppv_post', 'paid_dm', 'creator')),
  content_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_content_idx
  ON public.content_reports(content_type, content_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can read their own reports + insert new ones
DROP POLICY IF EXISTS "content_reports_reporter_read" ON public.content_reports;
CREATE POLICY "content_reports_reporter_read" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "content_reports_reporter_insert" ON public.content_reports;
CREATE POLICY "content_reports_reporter_insert" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
