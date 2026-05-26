DO $$
DECLARE
  g RECORD; m RECORD;
  using_parts text[]; check_parts text[];
  using_expr text; check_expr text;
  merged_name text; role_label text; sql text;
BEGIN
  FOR g IN
    SELECT schemaname, tablename, cmd, roles
    FROM pg_policies
    WHERE schemaname='public' AND permissive='PERMISSIVE'
    GROUP BY schemaname, tablename, cmd, roles
    HAVING COUNT(*) > 1
  LOOP
    using_parts := ARRAY[]::text[];
    check_parts := ARRAY[]::text[];

    FOR m IN
      SELECT policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname=g.schemaname AND tablename=g.tablename
        AND cmd=g.cmd AND roles=g.roles AND permissive='PERMISSIVE'
    LOOP
      IF m.qual IS NOT NULL THEN
        using_parts := using_parts || ('('||regexp_replace(m.qual,'\mis_admin\(\s*\)','is_admin(NULL::uuid)','g')||')');
      END IF;
      IF m.with_check IS NOT NULL THEN
        check_parts := check_parts || ('('||regexp_replace(m.with_check,'\mis_admin\(\s*\)','is_admin(NULL::uuid)','g')||')');
      END IF;
      EXECUTE format('DROP POLICY %I ON %I.%I',
        m.policyname, g.schemaname, g.tablename);
    END LOOP;

    role_label := regexp_replace(array_to_string(g.roles,'_'), '[^a-zA-Z0-9_]', '_', 'g');
    merged_name := left('merged_'||lower(g.cmd)||'_'||role_label, 63);

    using_expr := NULLIF(array_to_string(using_parts,' OR '),'');
    check_expr := NULLIF(array_to_string(check_parts,' OR '),'');

    sql := format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO %s',
      merged_name, g.schemaname, g.tablename, g.cmd, array_to_string(g.roles,','));
    IF using_expr IS NOT NULL THEN
      sql := sql || ' USING ('||using_expr||')';
    END IF;
    IF check_expr IS NOT NULL THEN
      sql := sql || ' WITH CHECK ('||check_expr||')';
    END IF;
    EXECUTE sql;
  END LOOP;
END $$;