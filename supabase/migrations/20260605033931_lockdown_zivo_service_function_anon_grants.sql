-- ZIVO service order workflow RPCs require a signed-in customer, driver, shop,
-- or backend actor. Revoke anonymous execution while preserving authenticated
-- app and service-role access.

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'zivo_accept_offer',
        'zivo_driver_heartbeat',
        'zivo_mark_messages_read',
        'zivo_redeem_service_promo',
        'zivo_send_service_message',
        'zivo_transition_status'
      ])
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
