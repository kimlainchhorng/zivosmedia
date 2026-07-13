
-- 1. Friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own friendships" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update incoming requests" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = friend_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 2. Story views
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES public.user_stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story owner can see views" ON public.story_views FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
CREATE POLICY "Users can record own view" ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- 3. Story comments
CREATE TABLE public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES public.user_stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can see story comments" ON public.story_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Friends can comment on stories" ON public.story_comments FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM public.user_stories s WHERE s.id = story_id AND s.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      JOIN public.user_stories s ON s.id = story_id
      WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = s.user_id) OR (f.friend_id = auth.uid() AND f.user_id = s.user_id))
    )
  )
);
CREATE POLICY "Users can delete own comments" ON public.story_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Views count trigger
CREATE OR REPLACE FUNCTION public.update_story_views_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_stories SET views_count = (SELECT count(*) FROM public.story_views WHERE story_id = NEW.story_id) WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_story_views_count AFTER INSERT ON public.story_views FOR EACH ROW EXECUTE FUNCTION public.update_story_views_count();
