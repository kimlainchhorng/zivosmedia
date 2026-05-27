-- Auto Repair — Invoices: fleet account linkage + credit-limit / PO enforcement.
--
-- ar_fleet_accounts already stores credit_limit_cents and po_required flags,
-- but nothing on the invoice side referenced or enforced them. This migration:
--   1. Adds fleet_account_id + po_number columns to ar_invoices.
--   2. Adds a BEFORE INSERT/UPDATE trigger that rejects invoices which would
--      breach the fleet's credit limit or omit a required PO number.
--   3. Indexes the new FK for fast outstanding-balance lookups.

alter table public.ar_invoices
  add column if not exists fleet_account_id uuid references public.ar_fleet_accounts(id) on delete set null,
  add column if not exists po_number text;

create index if not exists ar_invoices_fleet_account_id_idx
  on public.ar_invoices (fleet_account_id)
  where fleet_account_id is not null;

create or replace function public.ar_invoices_enforce_fleet_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fleet record;
  outstanding bigint;
  this_balance bigint;
begin
  -- Not a fleet invoice → nothing to enforce.
  if NEW.fleet_account_id is null then
    return NEW;
  end if;

  select id, name, po_required, credit_limit_cents
    into fleet
    from public.ar_fleet_accounts
    where id = NEW.fleet_account_id;

  if not found then
    raise exception 'Fleet account not found'
      using errcode = 'P0001';
  end if;

  -- PO number required?
  if fleet.po_required and (NEW.po_number is null or btrim(NEW.po_number) = '') then
    raise exception 'PO number is required for fleet account "%"', fleet.name
      using errcode = 'P0001';
  end if;

  -- Credit-limit check (only when a non-zero limit is configured).
  if coalesce(fleet.credit_limit_cents, 0) > 0 then
    select coalesce(sum(coalesce(total_cents, 0) - coalesce(amount_paid_cents, 0)), 0)
      into outstanding
      from public.ar_invoices
      where fleet_account_id = NEW.fleet_account_id
        and deleted_at is null
        and (TG_OP = 'INSERT' or id <> NEW.id);

    this_balance := coalesce(NEW.total_cents, 0) - coalesce(NEW.amount_paid_cents, 0);

    if outstanding + this_balance > fleet.credit_limit_cents then
      raise exception
        'Invoice exceeds credit limit for "%". Outstanding $%, this invoice $%, limit $%',
        fleet.name,
        to_char(outstanding / 100.0, 'FM999,999,990.00'),
        to_char(this_balance / 100.0, 'FM999,999,990.00'),
        to_char(fleet.credit_limit_cents / 100.0, 'FM999,999,990.00')
        using errcode = 'P0001';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists ar_invoices_enforce_fleet_rules_trg on public.ar_invoices;
create trigger ar_invoices_enforce_fleet_rules_trg
  before insert or update on public.ar_invoices
  for each row execute function public.ar_invoices_enforce_fleet_rules();
