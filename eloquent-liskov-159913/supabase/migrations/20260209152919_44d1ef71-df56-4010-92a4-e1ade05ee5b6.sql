
-- Automated message log for deduplication
CREATE TABLE public.automated_message_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL, -- 'abandoned_cart', 'reengagement', 'birthday'
  trigger_ref TEXT,           -- order_id or date reference
  channel TEXT NOT NULL,      -- 'push', 'email', 'sms'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_preview TEXT
);

ALTER TABLE public.automated_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automated messages"
  ON public.automated_message_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert automated messages"
  ON public.automated_message_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_automated_message_log_user ON public.automated_message_log(user_id, trigger_type, sent_at DESC);

-- Add date_of_birth to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add automated message preference columns to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS automated_messages_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automated_cart_reminders BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automated_reengagement BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automated_birthday BOOLEAN NOT NULL DEFAULT true;
