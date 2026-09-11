-- Post-deploy repair: only schema required by existing reads. No account/data migration.
-- Add the pre-existing story client contract without activating the wider moderation stack.
alter table public.stories
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists sensitive_reason text,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

-- Restrictive read policy composes with existing policies, including future grants.
-- Owners can still access their own records through any existing permissive policy.
drop policy if exists stories_hidden_read_boundary on public.stories;
create policy stories_hidden_read_boundary on public.stories as restrictive
  for select to anon, authenticated
  using (hidden_at is null or user_id = (select auth.uid()));

create or replace function public.list_own_customer_payout_methods(
  p_scope text default 'all',
  p_store_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  store_id uuid,
  method_type text,
  rail text,
  label text,
  bank_name text,
  account_holder_name text,
  destination_last4 text,
  country_code text,
  is_default boolean,
  is_verified boolean,
  verification_status text,
  verification_note text,
  verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_scope text := pg_catalog.lower(pg_catalog.btrim(p_scope));
begin
  if v_user_id is null then
    raise exception 'payout_method_authentication_required'
      using errcode = '42501';
  end if;
  if v_scope is null or v_scope not in ('all', 'account', 'store', 'store_or_account')
     or (
       v_scope in ('store', 'store_or_account')
       and p_store_id is null
     ) then
    raise exception 'payout_method_invalid_scope'
      using errcode = '22023';
  end if;

  return query
  select
    method.id,
    method.user_id,
    method.store_id,
    method.method_type,
    method.rail,
    method.label,
    method.bank_name,
    method.account_holder_name,
    nullif(
      pg_catalog.right(
        coalesce(method.account_number, method.aba_account_id, ''),
        4
      ),
      ''
    ) as destination_last4,
    method.country_code,
    method.is_default,
    method.is_verified,
    method.verification_status,
    null::text as verification_note,
    nullif(pg_catalog.to_jsonb(method)->>'verified_at', '')::timestamptz as verified_at,
    method.created_at,
    method.updated_at
  from public.customer_payout_methods as method
  where method.user_id = v_user_id
    and case v_scope
      when 'all' then true
      when 'account' then method.store_id is null
      when 'store' then method.store_id = p_store_id
      when 'store_or_account' then
        method.store_id = p_store_id or method.store_id is null
      else false
    end
  order by method.is_default desc, method.created_at desc, method.id desc;
end;
$$;

revoke all on function public.list_own_customer_payout_methods(text, uuid)
  from public, anon;
grant execute on function public.list_own_customer_payout_methods(text, uuid)
  to authenticated;

comment on function public.list_own_customer_payout_methods(text, uuid) is
  'Requester-only masked payout destinations. Never returns a complete bank account, ABA identifier, or finance evidence.';


notify pgrst, 'reload schema';
