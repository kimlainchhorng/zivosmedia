CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_follower_id ON public.user_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_followers_following_id ON public.user_followers(following_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON public.user_posts(user_id);