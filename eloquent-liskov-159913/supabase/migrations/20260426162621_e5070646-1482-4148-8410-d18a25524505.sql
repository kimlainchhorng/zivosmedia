
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  CREATE TYPE public.channel_role AS ENUM ('owner','admin','sub');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== TABLES (no policies yet — created together to avoid forward refs) =====

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle CITEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  owner_id UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT channels_handle_format CHECK (handle ~ '^[a-zA-Z0-9_]{3,32}$')
);
CREATE INDEX IF NOT EXISTS idx_channels_owner ON public.channels(owner_id);

CREATE TABLE IF NOT EXISTS public.channel_subscribers (
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.channel_role NOT NULL DEFAULT 'sub',
  notifications_on BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_subs_user ON public.channel_subscribers(user_id);

CREATE TABLE IF NOT EXISTS public.channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  reactions_count JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_channel_published ON public.channel_posts(channel_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_due ON public.channel_posts(scheduled_for) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS public.channel_post_reactions (
  post_id UUID NOT NULL REFERENCES public.channel_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.channel_post_reactions(post_id);

CREATE TABLE IF NOT EXISTS public.channel_post_views (
  post_id UUID NOT NULL REFERENCES public.channel_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ===== HELPER FUNCTIONS =====

CREATE OR REPLACE FUNCTION public.is_channel_manager(_channel_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c WHERE c.id = _channel_id AND c.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.channel_subscribers s
    WHERE s.channel_id = _channel_id AND s.user_id = _user_id AND s.role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_channel(_channel_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = _channel_id
      AND (c.is_public = true OR c.owner_id = _user_id
           OR EXISTS (SELECT 1 FROM public.channel_subscribers s
                      WHERE s.channel_id = _channel_id AND s.user_id = _user_id))
  );
$$;

-- ===== RLS =====
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels readable when public or member"
  ON public.channels FOR SELECT
  USING (is_public = true OR owner_id = auth.uid() OR public.can_view_channel(id, auth.uid()));

CREATE POLICY "owner can insert channels"
  ON public.channels FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner can update own channel"
  ON public.channels FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owner can delete own channel"
  ON public.channels FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "subscriber rows readable to self or channel owner"
  ON public.channel_subscribers FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.owner_id = auth.uid())
  );

CREATE POLICY "user can subscribe self"
  ON public.channel_subscribers FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can update own subscription"
  ON public.channel_subscribers FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user can unsubscribe self or owner can remove"
  ON public.channel_subscribers FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.owner_id = auth.uid())
  );

CREATE POLICY "posts readable when published and channel viewable"
  ON public.channel_posts FOR SELECT
  USING (
    published_at IS NOT NULL AND published_at <= now()
    AND public.can_view_channel(channel_id, auth.uid())
  );

CREATE POLICY "managers can read all own-channel posts"
  ON public.channel_posts FOR SELECT
  USING (public.is_channel_manager(channel_id, auth.uid()));

CREATE POLICY "managers can create posts"
  ON public.channel_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.is_channel_manager(channel_id, auth.uid()));

CREATE POLICY "managers can update own-channel posts"
  ON public.channel_posts FOR UPDATE
  USING (public.is_channel_manager(channel_id, auth.uid()));

CREATE POLICY "managers can delete own-channel posts"
  ON public.channel_posts FOR DELETE
  USING (public.is_channel_manager(channel_id, auth.uid()));

CREATE POLICY "reactions readable when post readable"
  ON public.channel_post_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_posts p
      WHERE p.id = post_id
        AND p.published_at IS NOT NULL AND p.published_at <= now()
        AND public.can_view_channel(p.channel_id, auth.uid())
    )
  );

CREATE POLICY "users can add own reactions"
  ON public.channel_post_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.channel_posts p
      WHERE p.id = post_id
        AND p.published_at IS NOT NULL
        AND public.can_view_channel(p.channel_id, auth.uid())
    )
  );

CREATE POLICY "users can remove own reactions"
  ON public.channel_post_reactions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "views readable to self or channel owner"
  ON public.channel_post_views FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.channel_posts p
      JOIN public.channels c ON c.id = p.channel_id
      WHERE p.id = post_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "user can record own view"
  ON public.channel_post_views FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user can update own view"
  ON public.channel_post_views FOR UPDATE USING (user_id = auth.uid());

-- ===== TRIGGERS =====

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_channels_touch ON public.channels;
CREATE TRIGGER trg_channels_touch BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_posts_touch ON public.channel_posts;
CREATE TRIGGER trg_posts_touch BEFORE UPDATE ON public.channel_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.bump_channel_sub_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.channels SET subscriber_count = subscriber_count + 1 WHERE id = NEW.channel_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.channels SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_subs_count ON public.channel_subscribers;
CREATE TRIGGER trg_subs_count AFTER INSERT OR DELETE ON public.channel_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.bump_channel_sub_count();

CREATE OR REPLACE FUNCTION public.add_owner_as_subscriber()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.channel_subscribers (channel_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (channel_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_owner_sub ON public.channels;
CREATE TRIGGER trg_owner_sub AFTER INSERT ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_subscriber();

CREATE OR REPLACE FUNCTION public.bump_post_reaction_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _emoji TEXT; _post UUID; _delta INT;
BEGIN
  IF (TG_OP = 'INSERT') THEN _emoji := NEW.emoji; _post := NEW.post_id; _delta := 1;
  ELSE _emoji := OLD.emoji; _post := OLD.post_id; _delta := -1;
  END IF;
  UPDATE public.channel_posts
     SET reactions_count = jsonb_set(
           reactions_count, ARRAY[_emoji],
           to_jsonb(GREATEST(COALESCE((reactions_count->>_emoji)::int, 0) + _delta, 0))
         )
   WHERE id = _post;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_reactions_count ON public.channel_post_reactions;
CREATE TRIGGER trg_reactions_count AFTER INSERT OR DELETE ON public.channel_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_reaction_count();

-- ===== VIEW-COUNT RPC =====

CREATE OR REPLACE FUNCTION public.record_channel_post_view(_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _existing TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT last_viewed_at INTO _existing
    FROM public.channel_post_views WHERE post_id = _post_id AND user_id = _uid;
  IF _existing IS NULL THEN
    INSERT INTO public.channel_post_views (post_id, user_id) VALUES (_post_id, _uid)
      ON CONFLICT DO NOTHING;
    UPDATE public.channel_posts SET view_count = view_count + 1 WHERE id = _post_id;
  ELSIF _existing < now() - interval '24 hours' THEN
    UPDATE public.channel_post_views SET last_viewed_at = now()
      WHERE post_id = _post_id AND user_id = _uid;
    UPDATE public.channel_posts SET view_count = view_count + 1 WHERE id = _post_id;
  END IF;
END; $$;
