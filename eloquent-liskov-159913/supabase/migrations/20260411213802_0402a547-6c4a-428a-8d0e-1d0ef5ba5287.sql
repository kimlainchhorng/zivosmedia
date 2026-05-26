
-- Add animated video URL to sticker_items
ALTER TABLE public.sticker_items
ADD COLUMN IF NOT EXISTS animated_video_url TEXT;

-- User installed packs tracking
CREATE TABLE IF NOT EXISTS public.user_sticker_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

ALTER TABLE public.user_sticker_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their installed packs"
  ON public.user_sticker_packs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can install packs"
  ON public.user_sticker_packs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can uninstall packs"
  ON public.user_sticker_packs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_sticker_packs_user ON public.user_sticker_packs(user_id);
