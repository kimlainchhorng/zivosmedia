-- Zivosmedia Payments / ZivoPay foundation.
-- Stores provider references, local status, webhook/audit history, and payout state.
-- Card data must stay with Stripe or the selected payment provider.

create extension if not exists pgcrypto;

do $$
begin
  create type public.zivo_payment_provider as enum ('stripe', 'manual', 'other');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.zivo_source_platform as enum (
    'zivosmedia',
    'zivo_travel',
    'zivo_driver',
    'zivo_software',
    'zivo_business',
    'zivo_chat',
    'zivo_admin'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.zivo_payment_order_status as enum (
    'pending',
    'checkout_created',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded',
    'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.zivo_subscription_status as enum (
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'cancelled',
    'incomplete',
    'paused',
    'expired'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.zivo_payout_status as enum (
    'not_ready',
    'pending_completion',
    'eligible',
    'payout_pending',
    'paid',
    'failed',
    'held',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.payment_customers (
  id uuid primary key default gen_random_uuid(),
  zivosmedia_user_id uuid not null,
  business_id uuid,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_customer_id text not null,
  email text,
  name text,
  phone text,
  default_currency text not null default 'usd',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_customers_provider_customer_unique unique (provider, provider_customer_id),
  constraint payment_customers_currency_lower check (default_currency = lower(default_currency) and char_length(default_currency) = 3)
);

create table if not exists public.business_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  business_owner_zivosmedia_user_id uuid not null,
  payment_customer_id uuid references public.payment_customers(id) on delete set null,
  billing_email text,
  tax_id text,
  billing_address jsonb not null default '{}'::jsonb,
  default_currency text not null default 'usd',
  payment_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_billing_profiles_business_unique unique (business_id),
  constraint business_billing_profiles_currency_lower check (default_currency = lower(default_currency) and char_length(default_currency) = 3)
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  zivosmedia_user_id uuid not null,
  source_platform public.zivo_source_platform not null,
  order_type text not null,
  related_table text not null,
  related_id uuid not null,
  business_id uuid,
  travel_booking_id uuid,
  driver_job_id uuid,
  software_product_id uuid,
  amount bigint not null,
  currency text not null default 'usd',
  status public.zivo_payment_order_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_orders_amount_nonnegative check (amount >= 0),
  constraint payment_orders_currency_lower check (currency = lower(currency) and char_length(currency) = 3)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null references public.payment_orders(id) on delete cascade,
  zivosmedia_user_id uuid not null,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_payment_intent_id text,
  provider_checkout_session_id text,
  provider_charge_id text,
  amount bigint not null,
  currency text not null default 'usd',
  status public.zivo_payment_order_status not null default 'pending',
  failure_code text,
  failure_message text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_amount_nonnegative check (amount >= 0),
  constraint payment_transactions_currency_lower check (currency = lower(currency) and char_length(currency) = 3)
);

create table if not exists public.payment_subscriptions (
  id uuid primary key default gen_random_uuid(),
  zivosmedia_user_id uuid not null,
  business_id uuid,
  software_product_id uuid,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_subscription_id text not null,
  provider_customer_id text not null,
  provider_price_id text,
  plan_name text,
  billing_interval text,
  status public.zivo_subscription_status not null default 'incomplete',
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_subscriptions_provider_unique unique (provider, provider_subscription_id)
);

create table if not exists public.payment_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.payment_subscriptions(id) on delete set null,
  zivosmedia_user_id uuid not null,
  business_id uuid,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_invoice_id text not null,
  invoice_number text,
  amount_due bigint not null default 0,
  amount_paid bigint not null default 0,
  currency text not null default 'usd',
  status text not null,
  hosted_invoice_url text,
  invoice_pdf_url text,
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_invoices_provider_unique unique (provider, provider_invoice_id),
  constraint payment_invoices_amounts_nonnegative check (amount_due >= 0 and amount_paid >= 0),
  constraint payment_invoices_currency_lower check (currency = lower(currency) and char_length(currency) = 3)
);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_refund_id text,
  amount bigint not null,
  currency text not null default 'usd',
  reason text,
  status text not null default 'pending',
  requested_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_refunds_provider_refund_unique unique (provider, provider_refund_id),
  constraint payment_refunds_amount_nonnegative check (amount >= 0),
  constraint payment_refunds_currency_lower check (currency = lower(currency) and char_length(currency) = 3)
);

create table if not exists public.driver_payouts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null,
  zivosmedia_user_id uuid not null,
  driver_job_id uuid not null,
  travel_booking_id uuid,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_connected_account_id text,
  provider_payout_id text,
  gross_amount bigint not null,
  platform_fee bigint not null default 0,
  driver_earning bigint not null,
  currency text not null default 'usd',
  status public.zivo_payout_status not null default 'not_ready',
  completed_at timestamptz,
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_payouts_amounts_nonnegative check (gross_amount >= 0 and platform_fee >= 0 and driver_earning >= 0),
  constraint driver_payouts_currency_lower check (currency = lower(currency) and char_length(currency) = 3)
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.zivo_payment_provider not null default 'stripe',
  provider_event_id text not null,
  event_type text not null,
  source_platform public.zivo_source_platform,
  related_payment_id uuid,
  related_subscription_id uuid,
  payload jsonb not null,
  processed boolean not null default false,
  processing_error text,
  retry_count integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_webhook_events_provider_event_unique unique (provider, provider_event_id)
);

create table if not exists public.payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid,
  zivosmedia_user_id uuid,
  business_id uuid,
  source_platform public.zivo_source_platform,
  payment_id uuid,
  subscription_id uuid,
  invoice_id uuid,
  refund_id uuid,
  payout_id uuid,
  success boolean not null default true,
  error_message text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_support_threads (
  id uuid primary key default gen_random_uuid(),
  chat_thread_id uuid not null,
  zivosmedia_user_id uuid not null,
  source_platform public.zivo_source_platform not null,
  payment_id uuid,
  invoice_id uuid,
  subscription_id uuid,
  travel_booking_id uuid,
  driver_job_id uuid,
  business_id uuid,
  assigned_admin_id uuid,
  status text not null default 'open',
  priority text not null default 'normal',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_customers_user on public.payment_customers (zivosmedia_user_id);
create index if not exists idx_payment_customers_business on public.payment_customers (business_id) where business_id is not null;
create index if not exists idx_business_billing_profiles_owner on public.business_billing_profiles (business_owner_zivosmedia_user_id);
create index if not exists idx_business_billing_profiles_customer on public.business_billing_profiles (payment_customer_id) where payment_customer_id is not null;
create index if not exists idx_payment_orders_user_created on public.payment_orders (zivosmedia_user_id, created_at desc);
create index if not exists idx_payment_orders_platform_status on public.payment_orders (source_platform, status, created_at desc);
create index if not exists idx_payment_orders_related on public.payment_orders (related_table, related_id);
create index if not exists idx_payment_orders_travel on public.payment_orders (travel_booking_id) where travel_booking_id is not null;
create index if not exists idx_payment_orders_driver_job on public.payment_orders (driver_job_id) where driver_job_id is not null;
create index if not exists idx_payment_transactions_order on public.payment_transactions (payment_order_id);
create index if not exists idx_payment_transactions_user_created on public.payment_transactions (zivosmedia_user_id, created_at desc);
create unique index if not exists idx_payment_transactions_payment_intent on public.payment_transactions (provider, provider_payment_intent_id) where provider_payment_intent_id is not null;
create unique index if not exists idx_payment_transactions_checkout_session on public.payment_transactions (provider, provider_checkout_session_id) where provider_checkout_session_id is not null;
create index if not exists idx_payment_subscriptions_user_status on public.payment_subscriptions (zivosmedia_user_id, status);
create index if not exists idx_payment_subscriptions_business_status on public.payment_subscriptions (business_id, status) where business_id is not null;
create index if not exists idx_payment_invoices_user_created on public.payment_invoices (zivosmedia_user_id, created_at desc);
create index if not exists idx_payment_refunds_transaction on public.payment_refunds (payment_transaction_id);
create index if not exists idx_driver_payouts_driver_status on public.driver_payouts (driver_id, status);
create index if not exists idx_driver_payouts_user_status on public.driver_payouts (zivosmedia_user_id, status);
create index if not exists idx_driver_payouts_job on public.driver_payouts (driver_job_id);
create index if not exists idx_payment_webhook_events_unprocessed on public.payment_webhook_events (processed, received_at) where processed = false;
create index if not exists idx_payment_audit_logs_created on public.payment_audit_logs (created_at desc);
create index if not exists idx_payment_audit_logs_user on public.payment_audit_logs (zivosmedia_user_id, created_at desc) where zivosmedia_user_id is not null;
create index if not exists idx_payment_support_threads_chat on public.payment_support_threads (chat_thread_id);
create index if not exists idx_payment_support_threads_user on public.payment_support_threads (zivosmedia_user_id, created_at desc);

create or replace function public.set_zivopay_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_payment_customers_updated_at on public.payment_customers;
create trigger trg_payment_customers_updated_at before update on public.payment_customers
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_business_billing_profiles_updated_at on public.business_billing_profiles;
create trigger trg_business_billing_profiles_updated_at before update on public.business_billing_profiles
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_payment_orders_updated_at on public.payment_orders;
create trigger trg_payment_orders_updated_at before update on public.payment_orders
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_payment_transactions_updated_at on public.payment_transactions;
create trigger trg_payment_transactions_updated_at before update on public.payment_transactions
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_payment_subscriptions_updated_at on public.payment_subscriptions;
create trigger trg_payment_subscriptions_updated_at before update on public.payment_subscriptions
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_payment_invoices_updated_at on public.payment_invoices;
create trigger trg_payment_invoices_updated_at before update on public.payment_invoices
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_payment_refunds_updated_at on public.payment_refunds;
create trigger trg_payment_refunds_updated_at before update on public.payment_refunds
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_driver_payouts_updated_at on public.driver_payouts;
create trigger trg_driver_payouts_updated_at before update on public.driver_payouts
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_payment_support_threads_updated_at on public.payment_support_threads;
create trigger trg_payment_support_threads_updated_at before update on public.payment_support_threads
for each row execute function public.set_zivopay_updated_at();

alter table public.payment_customers enable row level security;
alter table public.business_billing_profiles enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_subscriptions enable row level security;
alter table public.payment_invoices enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.driver_payouts enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.payment_audit_logs enable row level security;
alter table public.payment_support_threads enable row level security;

revoke all on public.payment_customers from anon, authenticated;
revoke all on public.business_billing_profiles from anon, authenticated;
revoke all on public.payment_orders from anon, authenticated;
revoke all on public.payment_transactions from anon, authenticated;
revoke all on public.payment_subscriptions from anon, authenticated;
revoke all on public.payment_invoices from anon, authenticated;
revoke all on public.payment_refunds from anon, authenticated;
revoke all on public.driver_payouts from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
revoke all on public.payment_audit_logs from anon, authenticated;
revoke all on public.payment_support_threads from anon, authenticated;

grant select on public.payment_customers to authenticated;
grant select on public.business_billing_profiles to authenticated;
grant select on public.payment_orders to authenticated;
grant select on public.payment_transactions to authenticated;
grant select on public.payment_subscriptions to authenticated;
grant select on public.payment_invoices to authenticated;
grant select on public.payment_refunds to authenticated;
grant select on public.driver_payouts to authenticated;
grant select on public.payment_support_threads to authenticated;

drop policy if exists "payment customers are visible to owner" on public.payment_customers;
create policy "payment customers are visible to owner"
on public.payment_customers for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

drop policy if exists "business billing profiles are visible to owner" on public.business_billing_profiles;
create policy "business billing profiles are visible to owner"
on public.business_billing_profiles for select
to authenticated
using ((select auth.uid()) = business_owner_zivosmedia_user_id);

drop policy if exists "payment orders are visible to owner" on public.payment_orders;
create policy "payment orders are visible to owner"
on public.payment_orders for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

drop policy if exists "payment transactions are visible to owner" on public.payment_transactions;
create policy "payment transactions are visible to owner"
on public.payment_transactions for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

drop policy if exists "payment subscriptions are visible to owner" on public.payment_subscriptions;
create policy "payment subscriptions are visible to owner"
on public.payment_subscriptions for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

drop policy if exists "payment invoices are visible to owner" on public.payment_invoices;
create policy "payment invoices are visible to owner"
on public.payment_invoices for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

drop policy if exists "payment refunds are visible through owned transaction" on public.payment_refunds;
create policy "payment refunds are visible through owned transaction"
on public.payment_refunds for select
to authenticated
using (
  exists (
    select 1
    from public.payment_transactions pt
    where pt.id = payment_refunds.payment_transaction_id
      and pt.zivosmedia_user_id = (select auth.uid())
  )
);

drop policy if exists "driver payouts are visible to driver user" on public.driver_payouts;
create policy "driver payouts are visible to driver user"
on public.driver_payouts for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

drop policy if exists "payment support threads are visible to owner" on public.payment_support_threads;
create policy "payment support threads are visible to owner"
on public.payment_support_threads for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

-- No anon/authenticated policies for webhook events or audit logs.
-- Admin dashboards and payment mutations must use server-side functions with service credentials.
