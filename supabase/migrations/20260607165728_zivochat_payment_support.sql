-- ZivoChat payment support linkage hardening.
-- The base table is created by the ZivoPay foundation migration; this migration
-- adds status/priority constraints and lookup indexes for support operations.

alter table public.payment_support_threads
  drop constraint if exists payment_support_threads_status_check,
  add constraint payment_support_threads_status_check
    check (status in ('open', 'pending_customer', 'pending_admin', 'resolved', 'closed'));

alter table public.payment_support_threads
  drop constraint if exists payment_support_threads_priority_check,
  add constraint payment_support_threads_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists idx_payment_support_threads_status
on public.payment_support_threads (status, priority, created_at desc);

create index if not exists idx_payment_support_threads_payment
on public.payment_support_threads (payment_id)
where payment_id is not null;

create index if not exists idx_payment_support_threads_invoice
on public.payment_support_threads (invoice_id)
where invoice_id is not null;

create index if not exists idx_payment_support_threads_subscription
on public.payment_support_threads (subscription_id)
where subscription_id is not null;

comment on table public.payment_support_threads is
  'ZivoChat payment support bridge. Payment-related support conversations link to Zivosmedia user identity, source platform, payment/subscription/invoice/travel/driver/business records, assignment, status, priority, and audit metadata.';
