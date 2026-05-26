CREATE TABLE IF NOT EXISTS public.store_employee_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  store_employee_id uuid NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  email text,
  phone text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sei_store ON public.store_employee_invites(store_id);
CREATE INDEX IF NOT EXISTS idx_sei_employee ON public.store_employee_invites(store_employee_id);
CREATE INDEX IF NOT EXISTS idx_sei_token ON public.store_employee_invites(token);

ALTER TABLE public.store_employee_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage invites"
  ON public.store_employee_invites
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = store_employee_invites.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = store_employee_invites.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Invitee can read own accepted invite"
  ON public.store_employee_invites
  FOR SELECT
  TO authenticated
  USING (accepted_by = auth.uid());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_to_work boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_open_to_work ON public.profiles(open_to_work) WHERE open_to_work = true;

CREATE OR REPLACE FUNCTION public.claim_employee_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.store_employee_invites%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite FROM public.store_employee_invites WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'store_id', v_invite.store_id);
  END IF;

  IF v_invite.status <> 'pending' OR v_invite.expires_at < now() THEN
    UPDATE public.store_employee_invites SET status = 'expired' WHERE id = v_invite.id AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'error', 'expired_or_revoked');
  END IF;

  UPDATE public.store_employees
     SET user_id = v_uid
   WHERE id = v_invite.store_employee_id;

  UPDATE public.store_employee_invites
     SET status = 'accepted',
         accepted_at = now(),
         accepted_by = v_uid
   WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'store_id', v_invite.store_id, 'store_employee_id', v_invite.store_employee_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_employee_invite(text) TO authenticated;