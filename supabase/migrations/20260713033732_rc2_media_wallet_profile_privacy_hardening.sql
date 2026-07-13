-- RC2 Media security boundary repair.
--
-- This migration is intentionally additive.  It restores column-level profile
-- privacy, makes platform-trust fields service-managed on both INSERT and
-- UPDATE, locks down private document/media buckets with restrictive policies,
-- and supplies the missing durable Stripe -> wallet -> ledger transaction.
-- Apply to a non-production Supabase branch before promotion.

begin;

-- MED-08: A later table-level GRANT SELECT undid the original PII hardening.
-- Keep public profile discovery working while excluding contact, identity, KYC,
-- and administrator-only attributes.
revoke select on public.profiles from anon, authenticated;

grant select (
  id, user_id, full_name, username, avatar_url, cover_url, cover_position, bio,
  is_verified, is_private, profile_visibility, display_brand_name,
  social_facebook, social_instagram, social_tiktok, social_snapchat,
  social_x, social_linkedin, social_telegram, social_onlyfans,
  social_links_visible, social_links,
  comment_control, hide_like_counts, allow_mentions, allow_sharing,
  allow_friend_requests, hide_from_drivers,
  selected_city_id, selected_city_name, zone_id, loyalty_tier_id,
  affiliate_partner_name, status, last_seen, role, setup_complete,
  created_at, updated_at
) on public.profiles to authenticated, anon;

-- MED-08 / MED-10: profile trust fields are never caller-controlled.  On
-- INSERT a non-service caller may only receive the schema's own default values;
-- on UPDATE it may not change any protected value.  Reading defaults from the
-- catalog makes the rule survive an enum/default change without hard-coding a
-- potentially incorrect KYC state.
create or replace function public.enforce_profiles_trust_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_column text;
  v_default_expression text;
  v_default_value text;
begin
  v_new := to_jsonb(new);
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;

  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  for v_column, v_default_expression in
    select column_name, column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = any (array[
        'is_verified', 'email_verified', 'phone_verified',
        'kyc_status', 'kyc_verified_at', 'kyc_rejection_reason',
        'background_check_status', 'background_check_reason',
        'payout_hold', 'admin_role', 'admin_2fa_enabled', 'is_bot'
      ])
  loop
    if tg_op = 'UPDATE' then
      if v_new -> v_column is distinct from v_old -> v_column then
        raise exception 'profile trust field % is service-managed', v_column
          using errcode = '42501';
      end if;
    elsif v_default_expression is null then
      if v_new -> v_column is not null and v_new ->> v_column is not null then
        raise exception 'profile trust field % is service-managed', v_column
          using errcode = '42501';
      end if;
    else
      execute format('select (%s)::text', v_default_expression) into v_default_value;
      if v_new ->> v_column is distinct from v_default_value then
        raise exception 'profile trust field % is service-managed', v_column
          using errcode = '42501';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.enforce_profiles_trust_columns() from public, anon, authenticated;

drop trigger if exists trg_enforce_profiles_trust_columns on public.profiles;
create trigger trg_enforce_profiles_trust_columns
  before insert or update on public.profiles
  for each row execute function public.enforce_profiles_trust_columns();

-- Private identity/document/media buckets remain non-public even if a broad
-- permissive policy is introduced later.  Restrictive policies compose with
-- existing owner/admin policies, so this does not remove legitimate policies.
update storage.buckets
set public = false
where id in ('driver-documents', 'identity-documents', 'kyc-documents', 'secret-media');

drop policy if exists rc2_private_storage_authenticated_gate on storage.objects;
create policy rc2_private_storage_authenticated_gate
on storage.objects as restrictive
for all to authenticated
using (
  bucket_id not in ('driver-documents', 'identity-documents', 'kyc-documents', 'secret-media')
  or (
    (bucket_id in ('driver-documents', 'identity-documents', 'kyc-documents')
      and ((storage.foldername(name))[1] = (select auth.uid())::text
           or public.has_role((select auth.uid()), 'admin')))
    or
    (bucket_id = 'secret-media'
      and public.is_secret_chat_participant_for_path(name))
  )
)
with check (
  bucket_id not in ('driver-documents', 'identity-documents', 'kyc-documents', 'secret-media')
  or (
    (bucket_id in ('driver-documents', 'identity-documents', 'kyc-documents')
      and ((storage.foldername(name))[1] = (select auth.uid())::text
           or public.has_role((select auth.uid()), 'admin')))
    or
    (bucket_id = 'secret-media'
      and public.is_secret_chat_participant_for_path(name)
      and owner = (select auth.uid()))
  )
);

drop policy if exists rc2_private_storage_anon_block on storage.objects;
create policy rc2_private_storage_anon_block
on storage.objects as restrictive
for all to anon
using (bucket_id not in ('driver-documents', 'identity-documents', 'kyc-documents', 'secret-media'))
with check (bucket_id not in ('driver-documents', 'identity-documents', 'kyc-documents', 'secret-media'));

-- MED-09: The old edge functions called a live-only credit RPC whose source was
-- absent from migration history.  This durable provider receipt is the unique
-- idempotency boundary for a Stripe payment reference.  The function updates
-- the balance, customer transaction, and financial ledger in one database
-- transaction; a failure rolls all three back so a charge cannot be credited
-- twice or leave an unrecorded wallet mutation.
create table if not exists public.wallet_provider_credits (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'stripe'),
  provider_reference text not null,
  user_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = lower(currency) and currency ~ '^[a-z]{3}$'),
  wallet_transaction_id uuid references public.customer_wallet_transactions(id),
  financial_ledger_id uuid references public.financial_ledger(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (provider, provider_reference)
);

alter table public.wallet_provider_credits enable row level security;
revoke all on table public.wallet_provider_credits from public, anon, authenticated;

create or replace function public.credit_user_wallet_topup(
  p_user_id uuid,
  p_amount_cents integer,
  p_currency text,
  p_stripe_reference text,
  p_description text default null
)
returns table(credited boolean, transaction_id uuid, balance_cents integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_currency text := lower(btrim(coalesce(p_currency, '')));
  v_credit public.wallet_provider_credits%rowtype;
  v_balance integer;
  v_transaction_id uuid;
  v_ledger_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or p_amount_cents is null or p_amount_cents <= 0
     or p_stripe_reference is null or btrim(p_stripe_reference) = ''
     or v_currency !~ '^[a-z]{3}$' then
    raise exception 'invalid_wallet_topup' using errcode = '22023';
  end if;

  insert into public.wallet_provider_credits (
    provider, provider_reference, user_id, amount_cents, currency
  ) values (
    'stripe', btrim(p_stripe_reference), p_user_id, p_amount_cents, v_currency
  )
  on conflict (provider, provider_reference) do nothing
  returning * into v_credit;

  if not found then
    select * into v_credit
    from public.wallet_provider_credits
    where provider = 'stripe' and provider_reference = btrim(p_stripe_reference);

    if v_credit.user_id <> p_user_id
       or v_credit.amount_cents <> p_amount_cents
       or v_credit.currency <> v_currency then
      raise exception 'stripe_reference_payload_mismatch' using errcode = '22023';
    end if;

    select balance_cents into v_balance
    from public.customer_wallets
    where user_id = p_user_id;

    return query select false, v_credit.wallet_transaction_id, coalesce(v_balance, 0);
    return;
  end if;

  insert into public.customer_wallets (user_id, balance_cents, lifetime_credits_cents)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  select balance_cents into v_balance
  from public.customer_wallets
  where user_id = p_user_id
  for update;

  update public.customer_wallets
  set balance_cents = coalesce(balance_cents, 0) + p_amount_cents,
      lifetime_credits_cents = coalesce(lifetime_credits_cents, 0) + p_amount_cents,
      updated_at = now()
  where user_id = p_user_id
  returning balance_cents into v_balance;

  insert into public.customer_wallet_transactions (
    user_id, amount_cents, balance_after_cents, type, description
  ) values (
    p_user_id, p_amount_cents, v_balance, 'topup',
    coalesce(nullif(btrim(p_description), ''), 'Stripe wallet top-up')
  ) returning id into v_transaction_id;

  insert into public.financial_ledger (
    user_id, entry_type, amount_cents, currency, balance_after_cents,
    stripe_reference, description
  ) values (
    p_user_id, 'wallet_topup', p_amount_cents, v_currency, v_balance,
    btrim(p_stripe_reference), coalesce(nullif(btrim(p_description), ''), 'Stripe wallet top-up')
  ) returning id into v_ledger_id;

  update public.wallet_provider_credits
  set wallet_transaction_id = v_transaction_id,
      financial_ledger_id = v_ledger_id,
      finalized_at = now()
  where id = v_credit.id;

  return query select true, v_transaction_id, v_balance;
end;
$$;

revoke all on function public.credit_user_wallet_topup(uuid, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.credit_user_wallet_topup(uuid, integer, text, text, text)
  to service_role;

comment on table public.wallet_provider_credits is
  'Immutable Stripe receipt/idempotency boundary for atomic wallet credits (RC2 MED-09).';

commit;
