-- Create live_chat_sessions table
CREATE TABLE public.live_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  agent_id UUID,
  agent_joined_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_by TEXT CHECK (ended_by IN ('user', 'agent', 'timeout')),
  context_type TEXT,
  context_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create live_chat_messages table
CREATE TABLE public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
  message TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_live_chat_sessions_user ON public.live_chat_sessions(user_id);
CREATE INDEX idx_live_chat_sessions_agent ON public.live_chat_sessions(agent_id);
CREATE INDEX idx_live_chat_sessions_status ON public.live_chat_sessions(status);
CREATE INDEX idx_live_chat_messages_session ON public.live_chat_messages(session_id);
CREATE INDEX idx_live_chat_messages_created ON public.live_chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_chat_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.live_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.live_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.live_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON public.live_chat_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all sessions"
  ON public.live_chat_sessions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for live_chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON public.live_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their sessions"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.live_chat_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can send messages"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update messages"
  ON public.live_chat_messages FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;

-- Trigger for updated_at
CREATE TRIGGER update_live_chat_sessions_updated_at
  BEFORE UPDATE ON public.live_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();