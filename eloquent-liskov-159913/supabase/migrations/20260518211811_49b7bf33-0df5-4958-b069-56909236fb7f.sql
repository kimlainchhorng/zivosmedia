-- Phase 1.1: Fix auth_rls_initplan warnings by wrapping auth.*() calls in (select ...)
-- Idempotent: the regex skips occurrences already preceded by SELECT.

DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  sql_stmt TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual ~* 'auth\.(uid|jwt|role)\(\)' AND qual !~* '\(\s*select\s+auth\.')
        OR (with_check ~* 'auth\.(uid|jwt|role)\(\)' AND with_check !~* '\(\s*select\s+auth\.')
      )
  LOOP
    -- Wrap unwrapped occurrences. Negative lookbehind avoids re-wrapping.
    new_qual := r.qual;
    new_check := r.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '(?<!select )auth\.uid\(\)',  '(select auth.uid())',  'gi');
      new_qual := regexp_replace(new_qual, '(?<!select )auth\.role\(\)', '(select auth.role())', 'gi');
      new_qual := regexp_replace(new_qual, '(?<!select )auth\.jwt\(\)',  '(select auth.jwt())',  'gi');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '(?<!select )auth\.uid\(\)',  '(select auth.uid())',  'gi');
      new_check := regexp_replace(new_check, '(?<!select )auth\.role\(\)', '(select auth.role())', 'gi');
      new_check := regexp_replace(new_check, '(?<!select )auth\.jwt\(\)',  '(select auth.jwt())',  'gi');
    END IF;

    -- Build ALTER POLICY with appropriate USING / WITH CHECK clauses based on cmd.
    IF r.cmd = 'INSERT' THEN
      -- INSERT only supports WITH CHECK
      IF new_check IS NULL THEN CONTINUE; END IF;
      sql_stmt := format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
                         r.policyname, r.schemaname, r.tablename, new_check);
    ELSIF r.cmd = 'SELECT' OR r.cmd = 'DELETE' THEN
      -- SELECT / DELETE only support USING
      IF new_qual IS NULL THEN CONTINUE; END IF;
      sql_stmt := format('ALTER POLICY %I ON %I.%I USING (%s)',
                         r.policyname, r.schemaname, r.tablename, new_qual);
    ELSE
      -- UPDATE / ALL support both
      IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
        sql_stmt := format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
                           r.policyname, r.schemaname, r.tablename, new_qual, new_check);
      ELSIF new_qual IS NOT NULL THEN
        sql_stmt := format('ALTER POLICY %I ON %I.%I USING (%s)',
                           r.policyname, r.schemaname, r.tablename, new_qual);
      ELSIF new_check IS NOT NULL THEN
        sql_stmt := format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
                           r.policyname, r.schemaname, r.tablename, new_check);
      ELSE
        CONTINUE;
      END IF;
    END IF;

    RAISE NOTICE 'Rewriting policy: %.% -> %', r.tablename, r.policyname, sql_stmt;
    EXECUTE sql_stmt;
  END LOOP;
END $$;