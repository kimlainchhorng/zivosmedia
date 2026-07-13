-- 1. video_call_sessions
CREATE TABLE IF NOT EXISTS public.video_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'mesh' CHECK (mode IN ('mesh','sfu')),
  call_type text NOT NULL DEFAULT 'video' CHECK (call_type IN ('audio','video')),
  recording_status text NOT NULL DEFAULT 'off' CHECK (recording_status IN ('off','recording','processing','ready','failed')),
  recording_egress_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vcs_host   ON public.video_call_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_vcs_active ON public.video_call_sessions(ended_at) WHERE ended_at IS NULL;

-- 2. video_call_participants
CREATE TABLE IF NOT EXISTS public.video_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.video_call_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  is_host boolean NOT NULL DEFAULT false,
  hand_raised boolean NOT NULL DEFAULT false,
  UNIQUE (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_vcp_session ON public.video_call_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_vcp_user    ON public.video_call_participants(user_id);

-- 3. video_call_recordings
CREATE TABLE IF NOT EXISTS public.video_call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.video_call_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  duration_seconds integer,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vcr_session ON public.video_call_recordings(session_id);

-- 4. RLS
ALTER TABLE public.video_call_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_recordings   ENABLE ROW LEVEL SECURITY;

-- Helper
CREATE OR REPLACE FUNCTION public.is_video_call_participant(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.video_call_participants
    WHERE session_id = _session_id AND user_id = auth.uid()
  );
$$;

-- video_call_sessions
DROP POLICY IF EXISTS "vcs: participants view" ON public.video_call_sessions;
DROP POLICY IF EXISTS "vcs: host insert"       ON public.video_call_sessions;
DROP POLICY IF EXISTS "vcs: host update"       ON public.video_call_sessions;
DROP POLICY IF EXISTS "vcs: host delete"       ON public.video_call_sessions;

CREATE POLICY "vcs: participants view"
ON public.video_call_sessions FOR SELECT TO authenticated
USING (host_id = auth.uid() OR public.is_video_call_participant(id));

CREATE POLICY "vcs: host insert"
ON public.video_call_sessions FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid());

CREATE POLICY "vcs: host update"
ON public.video_call_sessions FOR UPDATE TO authenticated
USING (host_id = auth.uid());

CREATE POLICY "vcs: host delete"
ON public.video_call_sessions FOR DELETE TO authenticated
USING (host_id = auth.uid());

-- video_call_participants
DROP POLICY IF EXISTS "vcp: members view"   ON public.video_call_participants;
DROP POLICY IF EXISTS "vcp: self join"      ON public.video_call_participants;
DROP POLICY IF EXISTS "vcp: self/host upd"  ON public.video_call_participants;
DROP POLICY IF EXISTS "vcp: self/host del"  ON public.video_call_participants;

CREATE POLICY "vcp: members view"
ON public.video_call_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.video_call_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
  OR public.is_video_call_participant(session_id)
);

CREATE POLICY "vcp: self join"
ON public.video_call_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "vcp: self/host upd"
ON public.video_call_participants FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.video_call_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
);

CREATE POLICY "vcp: self/host del"
ON public.video_call_participants FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.video_call_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
);

-- video_call_recordings (host-only)
DROP POLICY IF EXISTS "vcr: host view"   ON public.video_call_recordings;
DROP POLICY IF EXISTS "vcr: host insert" ON public.video_call_recordings;
DROP POLICY IF EXISTS "vcr: host delete" ON public.video_call_recordings;

CREATE POLICY "vcr: host view"
ON public.video_call_recordings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.video_call_sessions s WHERE s.id = session_id AND s.host_id = auth.uid()));

CREATE POLICY "vcr: host insert"
ON public.video_call_recordings FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.video_call_sessions s WHERE s.id = session_id AND s.host_id = auth.uid()));

CREATE POLICY "vcr: host delete"
ON public.video_call_recordings FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.video_call_sessions s WHERE s.id = session_id AND s.host_id = auth.uid()));

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('call-recordings', 'call-recordings', false, 524288000, ARRAY['video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

CREATE OR REPLACE FUNCTION public.is_video_call_recording_host_for_path(_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _sid uuid;
BEGIN
  BEGIN _sid := split_part(_path, '/', 1)::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  RETURN EXISTS (SELECT 1 FROM public.video_call_sessions WHERE id = _sid AND host_id = auth.uid());
END;
$$;

DROP POLICY IF EXISTS "call-recordings: host read"   ON storage.objects;
DROP POLICY IF EXISTS "call-recordings: host insert" ON storage.objects;
DROP POLICY IF EXISTS "call-recordings: host delete" ON storage.objects;

CREATE POLICY "call-recordings: host read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'call-recordings' AND public.is_video_call_recording_host_for_path(name));

CREATE POLICY "call-recordings: host insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'call-recordings' AND public.is_video_call_recording_host_for_path(name));

CREATE POLICY "call-recordings: host delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'call-recordings' AND public.is_video_call_recording_host_for_path(name));

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_participants;