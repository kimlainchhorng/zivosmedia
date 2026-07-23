-- Tighten older default authenticated table grants on channel moderation
-- tables. RLS policies already restrict rows/actions; these object grants now
-- match the policy-level access model instead of leaving inherited broad DML.

revoke all on table public.channel_removed_users from authenticated;
grant select, insert, delete on table public.channel_removed_users to authenticated;

revoke all on table public.channel_admin_log from authenticated;
grant select, insert on table public.channel_admin_log to authenticated;

revoke all on table public.channel_invite_links from authenticated;
grant select, insert, update, delete on table public.channel_invite_links to authenticated;
