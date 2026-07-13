-- Account, wallet, and trusted-device RPCs require a signed-in user. Revoke
-- anonymous execution while preserving app user and backend service access.

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
        'get_my_user_access',
        'get_my_bus_bookings',
        'get_daily_reward_status',
        'claim_daily_coin_reward',
        'register_trusted_device',
        'unlock_dm_with_wallet',
        'unlock_ppv_with_wallet'
      ])
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
