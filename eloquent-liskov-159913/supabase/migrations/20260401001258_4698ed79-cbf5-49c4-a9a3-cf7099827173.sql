ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS comment_control text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS hide_like_counts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_mentions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_sharing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_friend_requests boolean NOT NULL DEFAULT true;