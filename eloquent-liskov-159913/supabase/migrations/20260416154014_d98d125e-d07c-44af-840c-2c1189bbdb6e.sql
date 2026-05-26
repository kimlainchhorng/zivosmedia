
-- Persistent gift displays for big gifts on live streams
CREATE TABLE public.live_gift_displays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'Someone',
  gift_name TEXT NOT NULL,
  gift_icon TEXT,
  coins INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT '7d',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.live_gift_displays ENABLE ROW LEVEL SECURITY;

-- Anyone can view active displays
CREATE POLICY "Anyone can view gift displays"
  ON public.live_gift_displays FOR SELECT
  USING (expires_at > now());

-- Authenticated users can insert their own
CREATE POLICY "Users can create own gift displays"
  ON public.live_gift_displays FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Index for fast lookup by stream
CREATE INDEX idx_gift_displays_stream ON public.live_gift_displays (stream_id, expires_at DESC);
CREATE INDEX idx_gift_displays_sender ON public.live_gift_displays (sender_id);
