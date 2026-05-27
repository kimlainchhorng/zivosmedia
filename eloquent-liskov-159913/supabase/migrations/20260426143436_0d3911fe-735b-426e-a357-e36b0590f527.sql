ALTER TABLE public.voice_notes
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS transcript_lang text,
  ADD COLUMN IF NOT EXISTS message_id uuid;

CREATE INDEX IF NOT EXISTS idx_voice_notes_message_id ON public.voice_notes(message_id);

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS self_destruct_seconds int;

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Voice owner uploads" ON storage.objects;
CREATE POLICY "Voice owner uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Voice owner reads" ON storage.objects;
CREATE POLICY "Voice owner reads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Voice recipient reads via voice_notes" ON storage.objects;
CREATE POLICY "Voice recipient reads via voice_notes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.voice_notes vn
    JOIN public.direct_messages dm ON dm.id = vn.message_id
    WHERE vn.audio_url = name
      AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Voice owner deletes" ON storage.objects;
CREATE POLICY "Voice owner deletes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);