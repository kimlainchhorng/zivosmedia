ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public';
COMMENT ON COLUMN public.profiles.profile_visibility IS 'public, friends_only, or private';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_from_drivers boolean NOT NULL DEFAULT false;