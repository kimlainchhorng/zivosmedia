-- ZivoSoftware billing catalog and entitlements.
-- Stripe remains the first provider; catalog rows store provider IDs, not card data.

create table if not exists public.software_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text not null default 'software',
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.software_pricing_plans (
  id uuid primary key default gen_random_uuid(),
  software_product_id uuid not null references public.software_products(id) on delete cascade,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_price_id text not null,
  plan_name text not null,
  billing_interval text not null check (billing_interval in ('month', 'year', 'one_time', 'custom')),
  amount bigint not null default 0,
  currency text not null default 'usd',
  trial_period_days integer not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint software_pricing_plans_provider_price_unique unique (provider, provider_price_id),
  constraint software_pricing_plans_amount_nonnegative check (amount >= 0),
  constraint software_pricing_plans_trial_nonnegative check (trial_period_days >= 0),
  constraint software_pricing_plans_currency_lower check (currency = lower(currency) and char_length(currency) = 3)
);

create table if not exists public.business_software_entitlements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  zivosmedia_user_id uuid not null,
  software_product_id uuid not null references public.software_products(id) on delete cascade,
  payment_subscription_id uuid references public.payment_subscriptions(id) on delete set null,
  provider public.zivo_payment_provider not null default 'stripe',
  provider_subscription_id text,
  status public.zivo_subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_software_entitlements_unique unique (business_id, software_product_id)
);

create index if not exists idx_software_pricing_plans_product_active
  on public.software_pricing_plans (software_product_id, active);

create index if not exists idx_business_software_entitlements_owner
  on public.business_software_entitlements (zivosmedia_user_id, status);

create index if not exists idx_business_software_entitlements_business
  on public.business_software_entitlements (business_id, status);

create unique index if not exists idx_business_software_entitlements_provider_subscription
  on public.business_software_entitlements (provider, provider_subscription_id)
  where provider_subscription_id is not null;

drop trigger if exists trg_software_products_updated_at on public.software_products;
create trigger trg_software_products_updated_at before update on public.software_products
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_software_pricing_plans_updated_at on public.software_pricing_plans;
create trigger trg_software_pricing_plans_updated_at before update on public.software_pricing_plans
for each row execute function public.set_zivopay_updated_at();

drop trigger if exists trg_business_software_entitlements_updated_at on public.business_software_entitlements;
create trigger trg_business_software_entitlements_updated_at before update on public.business_software_entitlements
for each row execute function public.set_zivopay_updated_at();

alter table public.software_products enable row level security;
alter table public.software_pricing_plans enable row level security;
alter table public.business_software_entitlements enable row level security;

revoke all on public.software_products from anon, authenticated;
revoke all on public.software_pricing_plans from anon, authenticated;
revoke all on public.business_software_entitlements from anon, authenticated;

grant select on public.software_products to anon, authenticated;
grant select on public.software_pricing_plans to anon, authenticated;
grant select on public.business_software_entitlements to authenticated;

drop policy if exists "active software products are public" on public.software_products;
create policy "active software products are public"
on public.software_products for select
to anon, authenticated
using (status = 'active');

drop policy if exists "active software plans are public" on public.software_pricing_plans;
create policy "active software plans are public"
on public.software_pricing_plans for select
to anon, authenticated
using (
  active = true
  and exists (
    select 1
    from public.software_products sp
    where sp.id = software_pricing_plans.software_product_id
      and sp.status = 'active'
  )
);

drop policy if exists "business software entitlements visible to owner" on public.business_software_entitlements;
create policy "business software entitlements visible to owner"
on public.business_software_entitlements for select
to authenticated
using ((select auth.uid()) = zivosmedia_user_id);

insert into public.software_products (slug, name, description, category, status, metadata)
values
  ('zivo-business-core', 'Zivo Business Core', 'Business profile, billing, invoice, team, and software hub.', 'software', 'active', '{"platform":"zivo_business"}'::jsonb),
  ('zivo-auto-repair', 'Zivo Auto Repair', 'Auto repair work orders, VIN, invoices, parts, technicians, reports, and updates.', 'auto-repair', 'active', '{"platform":"zivo_software"}'::jsonb)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    status = excluded.status,
    metadata = software_products.metadata || excluded.metadata,
    updated_at = now();
