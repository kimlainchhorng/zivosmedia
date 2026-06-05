-- Channel and social mutation RPCs require a signed-in user. Revoke anonymous
-- execution while preserving authenticated app and service-role access.

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
        'channel_add_member',
        'channel_redeem_invite',
        'set_channel_verified',
        'toggle_channel_post_pin',
        'toggle_comment_like',
        'toggle_post_repost',
        'is_chat_member',
        'is_chat_participant',
        'is_video_call_participant'
      ])
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;
