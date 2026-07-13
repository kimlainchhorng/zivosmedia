-- Store owners can manage marketing campaigns for their own store so the
-- campaign wizard's "Send now" / "Draft" no longer fails RLS. Campaigns link to
-- the store via target_restaurant_id (legacy column name). The existing
-- admin-only policy stays; RLS policies are OR'd.
create policy "Store owners manage their campaigns"
on public.marketing_campaigns
for all
to authenticated
using (
  target_restaurant_id is not null
  and exists (
    select 1 from public.store_profiles s
    where s.id = marketing_campaigns.target_restaurant_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  target_restaurant_id is not null
  and exists (
    select 1 from public.store_profiles s
    where s.id = marketing_campaigns.target_restaurant_id
      and s.owner_id = (select auth.uid())
  )
);
