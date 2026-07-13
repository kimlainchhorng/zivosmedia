-- Allow anonymous and authenticated users to read public_profiles view
-- This view exposes only safe public fields (id, user_id, full_name, avatar_url)
-- and is used by the feed to display post author names and avatars.
GRANT SELECT ON public.public_profiles TO anon, authenticated;