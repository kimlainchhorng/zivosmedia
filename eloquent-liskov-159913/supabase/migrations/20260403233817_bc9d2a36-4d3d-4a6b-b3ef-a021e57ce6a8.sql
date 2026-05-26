
CREATE TABLE public.media_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 99,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks"
ON public.media_unlocks FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create unlocks"
ON public.media_unlocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "System can update unlocks"
ON public.media_unlocks FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);

CREATE INDEX idx_media_unlocks_message ON public.media_unlocks(message_id);
CREATE INDEX idx_media_unlocks_buyer ON public.media_unlocks(buyer_id);
