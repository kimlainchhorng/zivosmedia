
-- Sticker store packs
CREATE TABLE public.sticker_store_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  preview_emoji TEXT NOT NULL DEFAULT '😊',
  sticker_count INTEGER NOT NULL DEFAULT 0,
  gradient_color TEXT NOT NULL DEFAULT 'from-primary/20 to-accent/20',
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  stickers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sticker_store_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store packs" ON public.sticker_store_packs FOR SELECT USING (true);

-- User downloaded packs
CREATE TABLE public.user_downloaded_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.sticker_store_packs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

ALTER TABLE public.user_downloaded_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own downloads" ON public.user_downloaded_packs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can download packs" ON public.user_downloaded_packs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove downloads" ON public.user_downloaded_packs FOR DELETE USING (auth.uid() = user_id);

-- Avatar sticker moods
CREATE TABLE public.avatar_sticker_moods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji TEXT NOT NULL,
  label TEXT NOT NULL,
  gradient_from TEXT NOT NULL DEFAULT 'amber-400',
  gradient_to TEXT NOT NULL DEFAULT 'orange-400',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.avatar_sticker_moods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view avatar moods" ON public.avatar_sticker_moods FOR SELECT USING (true);

-- Shared music tracks
CREATE TABLE public.shared_music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '0:00',
  cover_emoji TEXT NOT NULL DEFAULT '🎵',
  preview_url TEXT,
  external_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_music_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view music tracks" ON public.shared_music_tracks FOR SELECT USING (true);

-- GIF trending cache
CREATE TABLE public.gif_trending (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gif_url TEXT NOT NULL,
  label TEXT,
  category TEXT NOT NULL DEFAULT 'Trending',
  source TEXT DEFAULT 'manual',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gif_trending ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trending gifs" ON public.gif_trending FOR SELECT USING (true);

-- Seed initial data
INSERT INTO public.sticker_store_packs (name, preview_emoji, sticker_count, gradient_color, category, stickers) VALUES
  ('Cute Cats', '🐱', 24, 'from-amber-400/20 to-orange-400/20', 'animals', '["🐱","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🐈","🐈‍⬛","🐱","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🐈","🐈‍⬛"]'),
  ('Anime Reactions', '⚡', 32, 'from-purple-400/20 to-pink-400/20', 'reactions', '["⚡","💥","✨","🌟","💫","🔥","❄️","🌊","🌪️","🌈","☀️","🌙","⭐","💎","🎭","🎪","⚡","💥","✨","🌟","💫","🔥","❄️","🌊","🌪️","🌈","☀️","🌙","⭐","💎","🎭","🎪"]'),
  ('Office Vibes', '💼', 18, 'from-blue-400/20 to-cyan-400/20', 'lifestyle', '["💼","📎","📋","✏️","📝","💻","🖥️","⌨️","🖱️","📱","☎️","📧","📊","📈","🗂️","📅","⏰","☕"]'),
  ('Food & Drinks', '🍕', 28, 'from-red-400/20 to-orange-400/20', 'food', '["🍕","🍔","🌮","🌯","🥗","🍜","🍝","🍣","🍱","🥘","🍲","🍛","🍙","🍚","🥟","🍤","🍗","🍖","🥩","🌭","🍟","🧇","🥞","🍳","🥚","☕","🧋","🍵"]'),
  ('Sport Stars', '⚽', 20, 'from-green-400/20 to-emerald-400/20', 'sports', '["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🤸","🏋️","🤺","🏇","⛷️","🏂","🏄","🚴","🤽"]'),
  ('Love & Hearts', '💕', 22, 'from-pink-400/20 to-rose-400/20', 'love', '["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💓","💗","💖","💘","💝","💟","♥️","🫶","💑","💏","💋"]'),
  ('Travel World', '✈️', 26, 'from-sky-400/20 to-blue-400/20', 'travel', '["✈️","🚂","🚢","🚗","🏖️","🏔️","🗼","🗽","🏰","🎡","🌍","🌎","🌏","🗺️","🧳","🎒","⛺","🏕️","🌅","🌄","🌠","🎆","🗿","🏛️","⛩️","🕌"]'),
  ('Retro Gaming', '🎮', 30, 'from-indigo-400/20 to-purple-400/20', 'gaming', '["🎮","🕹️","👾","👻","🤖","🎲","🃏","🀄","🎰","🏆","🥇","🥈","🥉","🎯","🎪","🎨","🎭","🎬","🎤","🎧","🎼","🎵","🎶","🔮","🧩","🎡","🎢","🎠","⚔️","🛡️"]');

INSERT INTO public.avatar_sticker_moods (emoji, label, gradient_from, gradient_to, sort_order) VALUES
  ('😊', 'Happy', 'amber-400', 'orange-400', 1),
  ('😂', 'LOL', 'yellow-400', 'amber-400', 2),
  ('😍', 'Love', 'pink-400', 'rose-400', 3),
  ('😎', 'Cool', 'blue-400', 'cyan-400', 4),
  ('🤔', 'Hmm', 'purple-400', 'violet-400', 5),
  ('😢', 'Sad', 'blue-300', 'indigo-400', 6),
  ('🥳', 'Party', 'fuchsia-400', 'pink-400', 7),
  ('😴', 'Sleepy', 'indigo-300', 'blue-300', 8),
  ('🤯', 'Mind Blown', 'red-400', 'orange-400', 9),
  ('💪', 'Strong', 'emerald-400', 'green-400', 10),
  ('🙏', 'Thanks', 'teal-400', 'emerald-400', 11),
  ('👋', 'Hi!', 'sky-400', 'blue-400', 12);

INSERT INTO public.shared_music_tracks (title, artist, duration, cover_emoji, sort_order) VALUES
  ('Blinding Lights', 'The Weeknd', '3:20', '🎵', 1),
  ('Levitating', 'Dua Lipa', '3:23', '🎶', 2),
  ('Stay', 'Kid Laroi & Justin Bieber', '2:21', '🎧', 3),
  ('Heat Waves', 'Glass Animals', '3:58', '🔥', 4),
  ('As It Was', 'Harry Styles', '2:47', '✨', 5),
  ('Anti-Hero', 'Taylor Swift', '3:20', '💜', 6);

INSERT INTO public.gif_trending (gif_url, label, category, sort_order) VALUES
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDFkam1xNm1kMzh4ZGE3NHVseXI4NnF5b3l2cGltdGRqZTVyeWZkYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VGG8UY1nEl66Y/giphy.gif', 'Happy', 'Trending', 1),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmV1ZDc0Y2RtdXN5cWl0cW5lYzZ0czU4MzUxbnNnaWM2cHJhYXlhaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnqM/giphy.gif', 'Thumbs Up', 'Trending', 2),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3NjNjR2M2tqb3RtcTQ3OGR0NTdyZHYyZHg5dW5rdGx4c3NtYjQ0ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XreQmk7ETCak0/giphy.gif', 'LOL', 'Trending', 3),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaW5uZm5hYWZyNDkxNXBhMGQzMTVhOGFnZWowcnAzcW4xbzV3cDgwNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI6SIIHBdRxXI40/giphy.gif', 'Dancing', 'Trending', 4),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOG1mOWRyYjlkeGp2b2ZhNGFyajR5ZmtjOGtsaG4wN3BrZTB6M2NiaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/artj92V8o75VPL7AeQ/giphy.gif', 'Celebrate', 'Reactions', 5),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3l1bG5xbTZ6dGg3OXVkaTZ4cjFpOTlqOXlnYjc3MnBrZjU4bnI2ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4cqiYI30juCOGY/giphy.gif', 'Heart', 'Love', 6),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTR2OTF3cjlrenByYnNqYm1nZHF1dXdoNjR6dGFlMmppMGV3ajd0MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2K5jinAlChoCLS/giphy.gif', 'Dance', 'Dance', 7),
  ('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjRuNm5qOWNqaXB0ZzNyYzl0dXJ6NHRpcXM2OGVpOGk3ZGRyNzhxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BPJmthQ3YRwD6QqcVD/giphy.gif', 'Clap', 'Reactions', 8);
