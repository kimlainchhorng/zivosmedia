-- SECURITY DEFINER trigger functions run through PostgreSQL triggers, not
-- through browser-facing PostgREST RPC calls. Revoke direct client execution
-- for every current public trigger function while preserving service-role
-- execute for backend operations and maintenance tooling.

do $$
declare
  fn regprocedure;
begin
  for fn in
    select distinct p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_trigger t on t.tgfoid = p.oid
    where n.nspname = 'public'
      and p.prosecdef
      and not t.tgisinternal
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('revoke execute on function %s from authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
