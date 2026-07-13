CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_one_pending_per_user
ON public.verification_requests (user_id)
WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.blue_verified_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  target_user_id uuid NOT NULL,
  reviewer_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'removed', 'manually_verified')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blue_verified_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view blue verified audit log" ON public.blue_verified_audit_log;
DROP POLICY IF EXISTS "Admins create blue verified audit log" ON public.blue_verified_audit_log;

CREATE POLICY "Admins view blue verified audit log"
ON public.blue_verified_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins create blue verified audit log"
ON public.blue_verified_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_blue_verified_audit_target_created
ON public.blue_verified_audit_log (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blue_verified_audit_request_created
ON public.blue_verified_audit_log (request_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users view own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins view verification documents" ON storage.objects;

CREATE POLICY "Users upload own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users view own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins view verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

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
  _action text;
  _reason text;
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

  _action := CASE WHEN _approved THEN 'approved' ELSE 'rejected' END;
  _reason := CASE WHEN _approved THEN NULL ELSE COALESCE(NULLIF(_rejection_reason, ''), 'Request was not approved') END;

  UPDATE public.verification_requests
  SET
    status = _action,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = _reason
  WHERE id = _request_id;

  UPDATE public.profiles
  SET is_verified = _approved
  WHERE user_id = _request.user_id OR id = _request.user_id;

  INSERT INTO public.blue_verified_audit_log (
    request_id,
    target_user_id,
    reviewer_user_id,
    action,
    reason,
    metadata
  ) VALUES (
    _request_id,
    _request.user_id,
    auth.uid(),
    _action,
    _reason,
    jsonb_build_object('category', _request.category, 'full_name', _request.full_name)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_blue_verified_manual(
  _target_user_id uuid,
  _verified boolean,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can update Blue Verified status';
  END IF;

  _action := CASE WHEN _verified THEN 'manually_verified' ELSE 'removed' END;

  UPDATE public.profiles
  SET is_verified = _verified
  WHERE user_id = _target_user_id OR id = _target_user_id;

  INSERT INTO public.blue_verified_audit_log (
    target_user_id,
    reviewer_user_id,
    action,
    reason,
    metadata
  ) VALUES (
    _target_user_id,
    auth.uid(),
    _action,
    NULLIF(_reason, ''),
    jsonb_build_object('manual', true)
  );
END;
$$;