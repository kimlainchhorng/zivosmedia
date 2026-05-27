-- 1. Extend secret_messages with media fields (all nullable - text-only messages still work)
ALTER TABLE public.secret_messages
  ADD COLUMN IF NOT EXISTS media_type text,           -- 'image' | 'video' | 'audio' | 'file' | null
  ADD COLUMN IF NOT EXISTS storage_path text,          -- '<chat_id>/<message_id>.bin'
  ADD COLUMN IF NOT EXISTS media_iv text,              -- base64 IV used to encrypt the blob
  ADD COLUMN IF NOT EXISTS media_key_wrapped text,     -- base64 of AES key encrypted to recipient
  ADD COLUMN IF NOT EXISTS mime text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS thumb_path text,
  ADD COLUMN IF NOT EXISTS thumb_iv text,
  ADD COLUMN IF NOT EXISTS file_name text;

-- 2. Create the private storage bucket for encrypted media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('secret-media', 'secret-media', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- 3. Helper: given a storage object path like '<chat_id>/<message_id>.bin',
--    return true iff the current user is a participant of that secret chat.
CREATE OR REPLACE FUNCTION public.is_secret_chat_participant_for_path(_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chat_id uuid;
BEGIN
  -- first segment of the path is the chat id
  BEGIN
    _chat_id := split_part(_path, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1 FROM public.secret_chats c
    WHERE c.id = _chat_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  );
END;
$$;

-- 4. Storage RLS policies on storage.objects scoped to the secret-media bucket
DROP POLICY IF EXISTS "secret-media: participants can read"   ON storage.objects;
DROP POLICY IF EXISTS "secret-media: participants can insert" ON storage.objects;
DROP POLICY IF EXISTS "secret-media: sender can delete"       ON storage.objects;

CREATE POLICY "secret-media: participants can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'secret-media'
  AND public.is_secret_chat_participant_for_path(name)
);

CREATE POLICY "secret-media: participants can insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'secret-media'
  AND public.is_secret_chat_participant_for_path(name)
  AND owner = auth.uid()
);

CREATE POLICY "secret-media: sender can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'secret-media'
  AND owner = auth.uid()
);

-- 5. Index for prune job (find expired media efficiently)
CREATE INDEX IF NOT EXISTS idx_secret_messages_expires_with_media
  ON public.secret_messages (expires_at)
  WHERE storage_path IS NOT NULL;