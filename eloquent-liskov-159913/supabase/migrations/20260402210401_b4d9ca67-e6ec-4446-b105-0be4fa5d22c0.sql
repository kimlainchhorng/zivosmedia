
-- Call history log
CREATE TABLE public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'missed' CHECK (status IN ('missed', 'answered', 'declined', 'no_answer', 'busy')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  call_signal_id UUID,
  recording_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call history"
  ON public.call_history FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can insert call history"
  ON public.call_history FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE INDEX idx_call_history_caller ON public.call_history(caller_id, created_at DESC);
CREATE INDEX idx_call_history_callee ON public.call_history(callee_id, created_at DESC);

-- Voicemails
CREATE TABLE public.voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  transcription TEXT,
  is_read BOOLEAN DEFAULT false,
  call_history_id UUID REFERENCES public.call_history(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voicemails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their voicemails"
  ON public.voicemails FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Callers can create voicemails"
  ON public.voicemails FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Recipients can update their voicemails"
  ON public.voicemails FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can delete their voicemails"
  ON public.voicemails FOR DELETE
  USING (auth.uid() = recipient_id);

-- Chat media attachments
CREATE TABLE public.chat_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  sender_id UUID NOT NULL,
  chat_partner_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size_bytes BIGINT DEFAULT 0,
  mime_type TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media in their conversations"
  ON public.chat_media FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = chat_partner_id);

CREATE POLICY "Users can send media"
  ON public.chat_media FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can delete their media"
  ON public.chat_media FOR DELETE
  USING (auth.uid() = sender_id);

CREATE INDEX idx_chat_media_conversation ON public.chat_media(sender_id, chat_partner_id, created_at DESC);

-- Group calls
CREATE TABLE public.group_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended')),
  max_participants INTEGER DEFAULT 8,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host can manage group calls"
  ON public.group_calls FOR ALL
  USING (auth.uid() = host_id);

-- Group call participants
CREATE TABLE public.group_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_call_id UUID NOT NULL REFERENCES public.group_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'left', 'declined')),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  is_camera_off BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_call_id, user_id)
);

ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their group calls"
  ON public.group_call_participants FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.group_call_participants gcp
    WHERE gcp.group_call_id = group_call_participants.group_call_id
    AND gcp.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own participant record"
  ON public.group_call_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Host can insert participants"
  ON public.group_call_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_calls gc
    WHERE gc.id = group_call_id AND gc.host_id = auth.uid()
  ) OR auth.uid() = user_id);

CREATE INDEX idx_group_call_participants ON public.group_call_participants(group_call_id, user_id);

-- Call recordings
CREATE TABLE public.call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_history_id UUID REFERENCES public.call_history(id) ON DELETE SET NULL,
  group_call_id UUID REFERENCES public.group_calls(id) ON DELETE SET NULL,
  recorder_id UUID NOT NULL,
  recording_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  consent_given_by UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recorder can manage their recordings"
  ON public.call_recordings FOR ALL
  USING (auth.uid() = recorder_id);

CREATE POLICY "Call participants can view recordings"
  ON public.call_recordings FOR SELECT
  USING (
    auth.uid() = ANY(consent_given_by)
    OR (call_history_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.call_history ch
      WHERE ch.id = call_history_id
      AND (ch.caller_id = auth.uid() OR ch.callee_id = auth.uid())
    ))
  );

-- Storage bucket for chat media files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media-files', 'chat-media-files', true);

CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media-files');

CREATE POLICY "Anyone can view chat media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media-files');

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media-files' AND auth.uid()::text = (storage.foldername(name))[1]);
