CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions"
ON public.message_reactions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_message_reactions_msg ON public.message_reactions(message_id);
