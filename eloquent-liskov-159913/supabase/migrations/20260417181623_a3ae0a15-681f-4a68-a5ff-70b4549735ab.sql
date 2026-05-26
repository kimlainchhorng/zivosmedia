-- Pairing sessions for "Continue on phone" go-live flow
CREATE TABLE IF NOT EXISTS public.live_pair_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL,
  store_owner_id UUID NOT NULL,
  store_name TEXT,
  store_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  phone_user_agent TEXT,
  phone_ip TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_pair_sessions_token ON public.live_pair_sessions(token);
CREATE INDEX IF NOT EXISTS idx_live_pair_sessions_owner ON public.live_pair_sessions(store_owner_id);

ALTER TABLE public.live_pair_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view their own pair sessions" ON public.live_pair_sessions;
CREATE POLICY "Owners view their own pair sessions"
  ON public.live_pair_sessions
  FOR SELECT
  USING (auth.uid() = store_owner_id);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_pair_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.live_pair_sessions REPLICA IDENTITY FULL;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.live_pair_sessions_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_live_pair_sessions_touch ON public.live_pair_sessions;
CREATE TRIGGER trg_live_pair_sessions_touch
BEFORE UPDATE ON public.live_pair_sessions
FOR EACH ROW EXECUTE FUNCTION public.live_pair_sessions_touch();

-- create_live_pair_session
CREATE OR REPLACE FUNCTION public.create_live_pair_session(p_store_id UUID)
RETURNS TABLE(session_id UUID, token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
  v_name TEXT;
  v_avatar TEXT;
  v_token TEXT;
  v_id UUID;
  v_exp TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT sp.owner_id, sp.name, sp.logo_url
    INTO v_owner, v_name, v_avatar
  FROM public.store_profiles sp
  WHERE sp.id = p_store_id;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Store not found'; END IF;
  IF v_owner <> v_uid THEN RAISE EXCEPTION 'Not authorized for this store'; END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_exp := now() + interval '5 minutes';

  INSERT INTO public.live_pair_sessions
    (token, store_id, store_owner_id, store_name, store_avatar_url, expires_at)
  VALUES
    (v_token, p_store_id, v_owner, v_name, v_avatar, v_exp)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_token, v_exp;
END;
$$;
REVOKE ALL ON FUNCTION public.create_live_pair_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_live_pair_session(UUID) TO authenticated;

-- get_live_pair_session
CREATE OR REPLACE FUNCTION public.get_live_pair_session(p_token TEXT)
RETURNS TABLE(
  session_id UUID,
  store_id UUID,
  store_name TEXT,
  store_avatar_url TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.store_id, s.store_name, s.store_avatar_url, s.status, s.expires_at
  FROM public.live_pair_sessions s
  WHERE s.token = p_token
  LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.get_live_pair_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_pair_session(TEXT) TO anon, authenticated;

-- confirm_live_pair_session
CREATE OR REPLACE FUNCTION public.confirm_live_pair_session(p_token TEXT, p_user_agent TEXT DEFAULT NULL)
RETURNS TABLE(session_id UUID, store_id UUID, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.live_pair_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.live_pair_sessions WHERE token = p_token FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Invalid pairing token'; END IF;
  IF v_row.expires_at < now() THEN
    UPDATE public.live_pair_sessions SET status='expired' WHERE id=v_row.id;
    RAISE EXCEPTION 'Pairing expired';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Pairing already %', v_row.status;
  END IF;

  UPDATE public.live_pair_sessions
    SET status='confirmed', confirmed_at=now(), phone_user_agent=p_user_agent
    WHERE id=v_row.id
    RETURNING id, store_id, status INTO session_id, store_id, status;

  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_live_pair_session(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_live_pair_session(TEXT, TEXT) TO anon, authenticated;

-- cancel_live_pair_session
CREATE OR REPLACE FUNCTION public.cancel_live_pair_session(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.live_pair_sessions
    SET status='cancelled', cancelled_at=now()
    WHERE token = p_token AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_live_pair_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_live_pair_session(TEXT) TO anon, authenticated;