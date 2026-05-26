
-- 1. Profiles: ensure scoped policy exists (may already be created)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users read own profile') THEN
    EXECUTE 'CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid())';
  END IF;
END $$;

-- Public view for other users' basic info
CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT id, full_name, avatar_url, share_code, is_verified, cover_url
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- 2. Fix cross-sell: remove OR true
DROP POLICY IF EXISTS "Combined read cross-sell" ON public.zivo_cross_sell_incentives;

CREATE POLICY "Public read active cross-sell" ON public.zivo_cross_sell_incentives
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 3. Fix realtime: scope to user's own channels
DROP POLICY IF EXISTS "realtime_read_scoped" ON realtime.messages;

CREATE POLICY "realtime_read_user_scoped" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic LIKE 'table:public.messages:%'
    OR topic LIKE CONCAT('user:', auth.uid()::text, ':%')
    OR topic LIKE CONCAT('%:', auth.uid()::text)
  );
