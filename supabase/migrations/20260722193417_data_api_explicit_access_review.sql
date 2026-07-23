-- Explicit Data API access review for public tables created after Supabase's
-- April 28, 2026 opt-in exposure change. RLS policies on these tables already
-- enforce row-level access; these grants/revokes make the object-level intent
-- clear for PostgREST/GraphQL.

-- Channel moderation/admin tables are signed-in manager/member features. Keep
-- them invisible to anonymous Data API clients and rely on existing RLS policies
-- for authenticated manager/actor checks.
revoke all on table public.channel_removed_users from anon;
grant select, insert, delete on table public.channel_removed_users to authenticated;
grant select, insert, update, delete on table public.channel_removed_users to service_role;

revoke all on table public.channel_admin_log from anon;
grant select, insert on table public.channel_admin_log to authenticated;
grant select, insert, update, delete on table public.channel_admin_log to service_role;

revoke all on table public.channel_invite_links from anon;
grant select, insert, update, delete on table public.channel_invite_links to authenticated;
grant select, insert, update, delete on table public.channel_invite_links to service_role;

-- Supplier credentials are sensitive store data. Store owners may manage them
-- through authenticated requests under the existing store-owner RLS policy; no
-- anonymous role should be able to discover or touch the table.
revoke all on table public.ar_supplier_credentials from anon;
grant select, insert, update, delete on table public.ar_supplier_credentials to authenticated;
grant select, insert, update, delete on table public.ar_supplier_credentials to service_role;
