-- 1. Add verification columns to store_profiles
ALTER TABLE public.store_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

CREATE INDEX IF NOT EXISTS idx_store_profiles_is_verified
  ON public.store_profiles (is_verified)
  WHERE is_verified = true;

-- 2. Extend audit log to support stores (column may not exist yet)
ALTER TABLE public.blue_verified_audit_log
  ADD COLUMN IF NOT EXISTS target_store_id uuid;

-- 3. Admin-only RPC to flip a store's verified flag
CREATE OR REPLACE FUNCTION public.set_store_blue_verified_manual(
  _store_id uuid,
  _verified boolean,
  _reason  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid := auth.uid();
BEGIN
  IF _admin IS NULL OR NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Only administrators may change store verification';
  END IF;

  UPDATE public.store_profiles
     SET is_verified = _verified,
         verified_at = CASE WHEN _verified THEN now() ELSE NULL END,
         verified_by = CASE WHEN _verified THEN _admin ELSE NULL END,
         updated_at  = now()
   WHERE id = _store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store % not found', _store_id;
  END IF;

  INSERT INTO public.blue_verified_audit_log (
    target_store_id, action, performed_by, reason, created_at
  ) VALUES (
    _store_id,
    CASE WHEN _verified THEN 'store_verified' ELSE 'store_unverified' END,
    _admin,
    _reason,
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_store_blue_verified_manual(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_store_blue_verified_manual(uuid, boolean, text) TO authenticated;

-- 4. Realtime: ensure verification changes propagate to all clients
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.store_profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;