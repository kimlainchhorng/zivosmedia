
-- Add facebook_url to store_profiles
ALTER TABLE public.store_profiles ADD COLUMN IF NOT EXISTS facebook_url text;

-- Store chat conversations
CREATE TABLE public.store_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

ALTER TABLE public.store_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats" ON public.store_chats
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chats" ON public.store_chats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Store chat messages
CREATE TABLE public.store_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.store_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'customer' CHECK (sender_type IN ('customer', 'store')),
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages" ON public.store_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_chats
      WHERE id = chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Chat participants can send messages" ON public.store_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.store_chats
      WHERE id = chat_id AND user_id = auth.uid()
    )
  );

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_chat_messages;
