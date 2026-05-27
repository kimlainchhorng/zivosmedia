ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Users create requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins view all verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins update verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins manage verification requests" ON public.verification_requests;

CREATE POLICY "Users view own verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own verification requests"
ON public.verification_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update verification requests"
ON public.verification_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete verification requests"
ON public.verification_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_created_at
ON public.verification_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_profile_blue_verified_from_request(
  _request_id uuid,
  _approved boolean,
  _rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.verification_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can review verification requests';
  END IF;

  SELECT * INTO _request
  FROM public.verification_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;

  UPDATE public.verification_requests
  SET
    status = CASE WHEN _approved THEN 'approved' ELSE 'rejected' END,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = CASE WHEN _approved THEN NULL ELSE COALESCE(NULLIF(_rejection_reason, ''), 'Request was not approved') END
  WHERE id = _request_id;

  UPDATE public.profiles
  SET is_verified = _approved
  WHERE user_id = _request.user_id OR id = _request.user_id;
END;
$$;