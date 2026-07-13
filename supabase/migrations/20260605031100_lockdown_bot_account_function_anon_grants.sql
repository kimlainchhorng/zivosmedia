-- Bot account/dashboard RPCs require a signed-in user. They should not be
-- callable by anonymous clients, but they remain available to authenticated
-- app users and service-role backend jobs.

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
        'block_bot',
        'unblock_bot',
        'subscribe_bot',
        'unsubscribe_bot',
        'rate_bot',
        'report_bot',
        'my_bot_conversations',
        'regenerate_bot_token',
        'rotate_webhook_secret',
        'bot_stats',
        'bot_report_summary',
        'bot_messages_daily',
        'bot_audience',
        'bot_export_conversation',
        'is_bot_admin'
      ])
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
