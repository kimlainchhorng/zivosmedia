
-- Followers table for follow/unfollow
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own follows" ON public.followers FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users can follow" ON public.followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);
