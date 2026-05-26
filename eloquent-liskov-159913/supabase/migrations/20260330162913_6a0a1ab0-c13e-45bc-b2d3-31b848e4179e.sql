
-- Live streams table
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  viewer_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live streams" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own streams" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streams" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Live stream comments
CREATE TABLE public.live_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live comments" ON public.live_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can post comments" ON public.live_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.live_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Live stream likes
CREATE TABLE public.live_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stream_id, user_id)
);
ALTER TABLE public.live_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live likes" ON public.live_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.live_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.live_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Live stream viewers
CREATE TABLE public.live_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stream_id, user_id)
);
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view viewers" ON public.live_viewers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join" ON public.live_viewers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON public.live_viewers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers to update counts
CREATE OR REPLACE FUNCTION public.update_live_viewer_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams SET viewer_count = (SELECT count(*) FROM public.live_viewers WHERE stream_id = NEW.stream_id) WHERE id = NEW.stream_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.live_streams SET viewer_count = (SELECT count(*) FROM public.live_viewers WHERE stream_id = OLD.stream_id) WHERE id = OLD.stream_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_live_viewer_count AFTER INSERT OR DELETE ON public.live_viewers FOR EACH ROW EXECUTE FUNCTION public.update_live_viewer_count();

CREATE OR REPLACE FUNCTION public.update_live_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams SET like_count = (SELECT count(*) FROM public.live_likes WHERE stream_id = NEW.stream_id) WHERE id = NEW.stream_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.live_streams SET like_count = (SELECT count(*) FROM public.live_likes WHERE stream_id = OLD.stream_id) WHERE id = OLD.stream_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_live_like_count AFTER INSERT OR DELETE ON public.live_likes FOR EACH ROW EXECUTE FUNCTION public.update_live_like_count();

-- Enable realtime for comments and viewers
ALTER publication supabase_realtime ADD TABLE public.live_comments;
ALTER publication supabase_realtime ADD TABLE public.live_viewers;
ALTER publication supabase_realtime ADD TABLE public.live_likes;
