-- P0: Email OTPs must be purpose/account-bound and never store a usable code.
--
-- Deploy this migration with the matching Edge Functions only after setting
-- OTP_CODE_HMAC_SECRET in the Function environment. The ordering deliberately
-- fails closed: legacy plaintext issuers cannot create a usable OTP after this
-- migration, and every legacy active row is invalidated.

BEGIN;

ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS code_hmac text;

-- Give historical rows a deterministic purpose before making the column
-- required. They are invalidated below and cannot be redeemed afterward.
UPDATE public.otp_codes
SET purpose = 'signup'
WHERE purpose IS NULL OR btrim(purpose) = '';

ALTER TABLE public.otp_codes
  ALTER COLUMN purpose SET DEFAULT 'signup',
  ALTER COLUMN purpose SET NOT NULL,
  ALTER COLUMN code DROP NOT NULL,
  ALTER COLUMN attempts SET DEFAULT 0,
  ALTER COLUMN attempts SET NOT NULL;

-- Old rows contain a plaintext code or lack the new HMAC binding. Never allow
-- them to bridge into the hardened verifier.
UPDATE public.otp_codes
SET
  code = NULL,
  code_hmac = NULL,
  verified_at = COALESCE(verified_at, now()),
  attempts = GREATEST(COALESCE(attempts, 0), 5)
WHERE code IS NOT NULL OR code_hmac IS NULL OR verified_at IS NULL;

-- Some deployed schema snapshots included a legacy `signup_data` column.
-- It must not retain a pre-verification password or other profile payload
-- after this cutover. The source migration history does not require that
-- column, so clear it only when it exists in the target database.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'otp_codes'
      AND column_name = 'signup_data'
  ) THEN
    EXECUTE 'UPDATE public.otp_codes SET signup_data = NULL WHERE signup_data IS NOT NULL';
  END IF;
END
$$;

ALTER TABLE public.otp_codes
  DROP CONSTRAINT IF EXISTS otp_codes_purpose_check,
  DROP CONSTRAINT IF EXISTS otp_codes_no_plaintext_code_check,
  DROP CONSTRAINT IF EXISTS otp_codes_active_hmac_check,
  DROP CONSTRAINT IF EXISTS otp_codes_attempts_nonnegative_check;

ALTER TABLE public.otp_codes
  ADD CONSTRAINT otp_codes_purpose_check
    CHECK (purpose IN ('signup', 'new_device', 'password_change', 'email_verification')),
  ADD CONSTRAINT otp_codes_no_plaintext_code_check
    CHECK (code IS NULL),
  ADD CONSTRAINT otp_codes_active_hmac_check
    CHECK (verified_at IS NOT NULL OR (code_hmac IS NOT NULL AND code_hmac ~ '^[0-9a-f]{64}$')),
  ADD CONSTRAINT otp_codes_attempts_nonnegative_check
    CHECK (attempts >= 0);

CREATE INDEX IF NOT EXISTS idx_otp_codes_active_scope
  ON public.otp_codes (email, purpose, user_id, created_at DESC)
  WHERE verified_at IS NULL;

-- otp_codes is exclusively an Edge Function implementation detail. Remove
-- every historical policy (including the old PUBLIC FOR ALL policy) and table
-- grants, then re-grant only the service role used by the hardened functions.
DO $$
DECLARE
  existing_policy text;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'otp_codes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.otp_codes', existing_policy);
  END LOOP;
END
$$;

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.otp_codes FROM PUBLIC;
REVOKE ALL ON TABLE public.otp_codes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.otp_codes TO service_role;

CREATE POLICY "otp_codes_service_role_only"
  ON public.otp_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
