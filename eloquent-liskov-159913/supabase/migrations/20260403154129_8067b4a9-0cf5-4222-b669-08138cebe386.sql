
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text',
  image_url TEXT,
  video_url TEXT,
  voice_url TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled messages"
ON public.scheduled_messages FOR SELECT
USING (auth.uid() = sender_id);

CREATE POLICY "Users can create scheduled messages"
ON public.scheduled_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own scheduled messages"
ON public.scheduled_messages FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own scheduled messages"
ON public.scheduled_messages FOR DELETE
USING (auth.uid() = sender_id);

CREATE INDEX idx_scheduled_messages_sender ON public.scheduled_messages(sender_id);
CREATE INDEX idx_scheduled_messages_status ON public.scheduled_messages(status, scheduled_at);
