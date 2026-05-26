
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.get_job_otp_plain(uuid, text);

CREATE OR REPLACE FUNCTION public.get_job_otp_plain(p_job_id uuid, p_enc_key text)
RETURNS TABLE(otp text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    convert_from(
      pgp_sym_decrypt(jo.otp_enc, p_enc_key),
      'UTF8'
    ) AS otp,
    jo.expires_at
  FROM job_otps jo
  WHERE jo.job_id = p_job_id
    AND jo.verified_at IS NULL
    AND jo.expires_at > now()
  ORDER BY jo.created_at DESC
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_job_otp_plain(uuid, text) FROM anon, authenticated;
