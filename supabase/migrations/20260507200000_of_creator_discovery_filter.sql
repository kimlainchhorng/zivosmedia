-- OF Creator visibility: hide OF creator profiles from in-app discovery (feed, search, explore, discover people).
-- OF creator profiles are still accessible via direct URL (PublicProfilePage queries profiles table directly).

-- 1. Add is_of_creator flag to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_of_creator boolean NOT NULL DEFAULT false;

-- 2. Recreate public_profiles view to exclude OF creators from in-app feed/search/discovery.
--    This view is used by feed search overlays, reels search, and comment sheets.
--    OF creators are hidden here but their full profile is still accessible via direct URL.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT p.id, p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.is_of_creator = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
