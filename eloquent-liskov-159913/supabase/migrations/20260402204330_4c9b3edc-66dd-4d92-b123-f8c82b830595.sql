
-- Chat notification settings per conversation
CREATE TABLE public.chat_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_partner_id TEXT NOT NULL,
  is_muted BOOLEAN DEFAULT false,
  mute_until TIMESTAMP WITH TIME ZONE,
  notification_tone TEXT DEFAULT 'default',
  dnd_start TIME,
  dnd_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_partner_id)
);

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat settings"
  ON public.chat_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat settings"
  ON public.chat_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat settings"
  ON public.chat_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat settings"
  ON public.chat_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Delivery timestamp on direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Sticker packs
CREATE TABLE public.chat_sticker_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji_prefix TEXT,
  stickers JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sticker_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view sticker packs"
  ON public.chat_sticker_packs FOR SELECT
  USING (true);

-- Seed default sticker packs
INSERT INTO public.chat_sticker_packs (name, emoji_prefix, stickers, is_default) VALUES
  ('Classic', '😀', '["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😗","😙","😚","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤥","😬","😒","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"]', true),
  ('Animals', '🐶', '["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪲","🪳","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓"]', true),
  ('Love & Celebration', '❤️', '["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🎉","🎊","🎈","🎁","🎂","🍰","🥂","🍾","✨","🌟","⭐","💫","🔥","💥","🎆","🎇","🏆","🥇","🎯","🎵","🎶","🎤","🎸","🎹","🎺","🎻","🥁","🎬","🎭","🎨","🎪","🤹","💐","🌹","🌺","🌸","🌼","🌻","🌷","💮"]', true);
