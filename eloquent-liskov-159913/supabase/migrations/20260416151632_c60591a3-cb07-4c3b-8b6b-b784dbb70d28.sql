
-- Create the live_gifts table
CREATE TABLE public.live_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🎁',
  coins INTEGER NOT NULL DEFAULT 1,
  tab TEXT NOT NULL DEFAULT 'gifts' CHECK (tab IN ('gifts', 'interactive', 'exclusive')),
  badge TEXT,
  bg_gradient TEXT NOT NULL DEFAULT 'from-gray-300 to-gray-400',
  level INTEGER NOT NULL DEFAULT 1,
  video_url TEXT,
  icon_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast catalog queries
CREATE INDEX idx_live_gifts_tab_active ON public.live_gifts (tab, is_active, sort_order);

-- Enable RLS
ALTER TABLE public.live_gifts ENABLE ROW LEVEL SECURITY;

-- Public read for active gifts
CREATE POLICY "Anyone can view active gifts"
  ON public.live_gifts FOR SELECT
  USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage gifts"
  ON public.live_gifts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp trigger
CREATE TRIGGER update_live_gifts_updated_at
  BEFORE UPDATE ON public.live_gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed all existing gifts
INSERT INTO public.live_gifts (name, icon, coins, tab, badge, bg_gradient, level, sort_order) VALUES
  -- Gifts tab
  ('Lucky Cat', '🐱', 1, 'gifts', NULL, 'from-amber-200 to-yellow-200', 1, 1),
  ('Cute Panda', '🐼', 1, 'gifts', NULL, 'from-green-300 to-emerald-300', 1, 2),
  ('Baby Dragon', '🐉', 1, 'gifts', 'Popular', 'from-orange-400 to-red-400', 1, 3),
  ('Ice Penguin', '🐧', 5, 'gifts', NULL, 'from-cyan-200 to-sky-200', 1, 4),
  ('King Cobra', '🐍', 5, 'gifts', NULL, 'from-purple-400 to-violet-400', 1, 5),
  ('Rainbow Butterfly', '🦋', 5, 'gifts', NULL, 'from-violet-300 to-pink-300', 1, 6),
  ('Star Fox', '🦊', 10, 'gifts', NULL, 'from-orange-300 to-amber-300', 2, 7),
  ('Crystal Unicorn', '🦄', 10, 'gifts', NULL, 'from-pink-300 to-fuchsia-300', 2, 8),
  ('Magic Rabbit', '🐰', 15, 'gifts', NULL, 'from-purple-300 to-indigo-300', 2, 9),
  ('Snake Dance', '🐍', 20, 'gifts', NULL, 'from-green-400 to-lime-400', 2, 10),
  ('Neon Dolphin', '🐬', 30, 'gifts', NULL, 'from-blue-400 to-cyan-400', 2, 11),
  ('Mystic Wolf', '🐺', 30, 'gifts', NULL, 'from-blue-300 to-indigo-300', 2, 12),
  ('Shadow Wolf', '🐺', 45, 'gifts', 'NEW', 'from-purple-900 to-indigo-900', 2, 13),
  ('Phoenix Rising', '🔥', 50, 'gifts', 'NEW', 'from-orange-500 to-red-500', 3, 14),
  ('Golden Phoenix', '🔥', 75, 'gifts', 'Epic', 'from-yellow-400 to-amber-500', 3, 15),
  ('Diamond Bear', '', 99, 'gifts', NULL, 'from-sky-200 to-blue-200', 3, 16),
  ('Thunder Tiger', '🐯', 199, 'gifts', NULL, 'from-amber-400 to-orange-400', 4, 17),
  ('Fire Dragon', '🐉', 299, 'gifts', 'Interaction', 'from-red-500 to-orange-500', 4, 18),
  -- Interactive tab
  ('Panda Party', '🐼', 100, 'interactive', 'NEW', 'from-green-300 to-teal-300', 4, 1),
  ('Sapphire Swan', '🦢', 699, 'interactive', NULL, 'from-blue-200 to-sky-200', 5, 2),
  ('Royal Crown', '👑', 888, 'interactive', NULL, 'from-yellow-400 to-amber-500', 5, 3),
  ('Gold Fountain', '🪙', 999, 'interactive', NULL, 'from-yellow-300 to-amber-300', 5, 4),
  ('Emerald Eagle', '🦅', 1200, 'interactive', NULL, 'from-green-500 to-emerald-500', 6, 5),
  ('Diamond Rain', '', 1500, 'interactive', NULL, 'from-sky-300 to-blue-300', 6, 6),
  ('Crystal Pegasus', '🦄', 1800, 'interactive', 'Epic', 'from-pink-200 to-sky-200', 6, 7),
  ('Platinum Panda', '🐼', 1999, 'interactive', NULL, 'from-gray-300 to-slate-300', 6, 8),
  ('Luxury Lambo', '🏎️', 2000, 'interactive', NULL, 'from-red-500 to-rose-500', 6, 9),
  ('Treasure Dragon', '🐉', 2500, 'interactive', NULL, 'from-green-400 to-emerald-400', 6, 10),
  ('Neon Rocket', '🚀', 2800, 'interactive', 'Epic', 'from-blue-500 to-purple-500', 6, 11),
  ('Gold Ferrari', '🏎️', 3000, 'interactive', NULL, 'from-yellow-400 to-amber-400', 6, 12),
  ('Gold Helicopter', '🚁', 3500, 'interactive', NULL, 'from-amber-400 to-yellow-400', 6, 13),
  ('Rolls Royce', '🚗', 5000, 'interactive', 'Luxury', 'from-gray-200 to-slate-200', 7, 14),
  -- Exclusive tab
  ('Black Panther', '🐆', 4999, 'exclusive', 'NEW', 'from-purple-900 to-indigo-900', 7, 1),
  ('Bugatti', '🏎️', 9999, 'exclusive', 'Luxury', 'from-blue-500 to-cyan-500', 7, 2),
  ('Diamond Dragon', '🐉', 15000, 'exclusive', NULL, 'from-sky-300 to-blue-300', 8, 3),
  ('Luxury Yacht', '🛥️', 19999, 'exclusive', NULL, 'from-blue-400 to-indigo-400', 8, 4),
  ('Private Island', '🏝️', 29999, 'exclusive', 'Ultimate', 'from-green-400 to-teal-400', 9, 5),
  ('Cosmic Dragon', '🐉', 35000, 'exclusive', 'Mythic', 'from-violet-600 to-indigo-900', 9, 6),
  ('Galaxy Crown', '🌌', 49999, 'exclusive', 'Legendary', 'from-violet-600 to-purple-900', 9, 7),
  ('Golden Castle', '🏰', 59999, 'exclusive', 'Supreme', 'from-amber-500 to-yellow-600', 10, 8),
  ('Diamond Throne', '💎', 75000, 'exclusive', 'Divine', 'from-sky-400 to-blue-600', 10, 9),
  ('Celestial Phoenix', '🔥', 99999, 'exclusive', 'Immortal', 'from-orange-500 to-rose-600', 10, 10);
