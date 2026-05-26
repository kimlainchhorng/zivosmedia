-- 1. Per-user, per-thread chat settings
CREATE TABLE IF NOT EXISTS public.chat_thread_settings (
  user_id UUID NOT NULL,
  thread_id TEXT NOT NULL,
  muted_until TIMESTAMPTZ,
  notification_mode TEXT NOT NULL DEFAULT 'all' CHECK (notification_mode IN ('all','mentions','none')),
  pinned_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);
ALTER TABLE public.chat_thread_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner manages thread settings" ON public.chat_thread_settings;
CREATE POLICY "owner manages thread settings"
  ON public.chat_thread_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_settings_user_pinned
  ON public.chat_thread_settings(user_id, pinned_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chat_thread_settings_user_archived
  ON public.chat_thread_settings(user_id, archived_at);
DROP TRIGGER IF EXISTS trg_chat_thread_settings_updated_at ON public.chat_thread_settings;
CREATE TRIGGER trg_chat_thread_settings_updated_at
  BEFORE UPDATE ON public.chat_thread_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. User privacy preferences
CREATE TABLE IF NOT EXISTS public.user_privacy (
  user_id UUID PRIMARY KEY,
  last_seen_scope TEXT NOT NULL DEFAULT 'everyone' CHECK (last_seen_scope IN ('everyone','contacts','nobody')),
  call_scope TEXT NOT NULL DEFAULT 'everyone' CHECK (call_scope IN ('everyone','contacts','nobody')),
  message_scope TEXT NOT NULL DEFAULT 'everyone' CHECK (message_scope IN ('everyone','contacts','nobody')),
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_privacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads privacy" ON public.user_privacy;
CREATE POLICY "anyone reads privacy"
  ON public.user_privacy FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "owner inserts privacy" ON public.user_privacy;
CREATE POLICY "owner inserts privacy"
  ON public.user_privacy FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "owner updates privacy" ON public.user_privacy;
CREATE POLICY "owner updates privacy"
  ON public.user_privacy FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_user_privacy_updated_at ON public.user_privacy;
CREATE TRIGGER trg_user_privacy_updated_at
  BEFORE UPDATE ON public.user_privacy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();