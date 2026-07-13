-- Create direct messages table for personal chat
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view their own DMs"
ON public.direct_messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send DMs"
ON public.direct_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages sent to them as read
CREATE POLICY "Users can mark received DMs as read"
ON public.direct_messages FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Index for efficient lookups
CREATE INDEX idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_dm_receiver ON public.direct_messages(receiver_id, created_at DESC);
CREATE INDEX idx_dm_conversation ON public.direct_messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);