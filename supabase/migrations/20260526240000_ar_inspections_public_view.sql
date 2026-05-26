-- Auto Repair — public read access for inspections shared via token.
-- The shop generates a share_token and gives the link to the customer; without
-- a SELECT policy keyed on the token, anonymous viewers hit "Inspection Not
-- Found" even when the link is valid.

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ar_inspections'
      and policyname = 'Public inspection view by token'
  ) then
    create policy "Public inspection view by token"
      on public.ar_inspections for select
      using (share_token is not null);
  end if;
end $$;
