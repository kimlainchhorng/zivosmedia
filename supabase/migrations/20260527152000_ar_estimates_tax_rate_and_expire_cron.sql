-- Auto Repair — Estimates: add missing tax_rate column + schedule an hourly
-- auto-expire cron that flips sent estimates past their expires_at date to
-- status='expired'. The admin form has always captured a tax rate, but the
-- column to persist it never existed. And the customer-facing approval page
-- relies on status='expired' to show the right messaging.

alter table public.ar_estimates
  add column if not exists tax_rate numeric not null default 0;

select cron.schedule(
  'ar-estimates-auto-expire-hourly',
  '0 * * * *',
  $$
    update public.ar_estimates
    set status = 'expired'
    where status = 'sent'
      and expires_at is not null
      and expires_at < current_date;
  $$
);
