ALTER TABLE public.chat_settings
ADD COLUMN IF NOT EXISTS custom_wallpapers text[] NOT NULL DEFAULT '{}'::text[];