-- Supabase's performance advisor flags ten foreign keys with no covering
-- index. Postgres does not create one automatically for the referencing side,
-- so every join across them and every delete/update on the referenced parent
-- has to scan the child table.
--
-- All ten tables are currently tiny (largest is 532 rows / 408 kB), so these
-- build instantly and the write-lock is negligible. Doing it now is cheap;
-- doing it once savings circles or the auth audit log have grown is not.
--
-- Column names are taken from pg_constraint, not inferred from the
-- constraint names: lodging_cutluy_payments_accounted_event_id_fkey is
-- actually on reservation_paid_accounted_event_id.

create index if not exists idx_lodging_cutluy_manual_actions_payment_attempt_id
  on public.lodging_cutluy_manual_actions (payment_attempt_id);
create index if not exists idx_lodging_cutluy_manual_actions_store_id
  on public.lodging_cutluy_manual_actions (store_id);
create index if not exists idx_lodging_cutluy_manual_actions_webhook_event_id
  on public.lodging_cutluy_manual_actions (webhook_event_id);

create index if not exists idx_lodging_cutluy_payments_reservation_paid_accounted_event_id
  on public.lodging_cutluy_payments (reservation_paid_accounted_event_id);

create index if not exists idx_savings_circle_contributions_member_id
  on public.savings_circle_contributions (member_id);
create index if not exists idx_savings_circle_rounds_payout_member_id
  on public.savings_circle_rounds (payout_member_id);
create index if not exists idx_savings_circles_creator_id
  on public.savings_circles (creator_id);
create index if not exists idx_savings_circles_group_id
  on public.savings_circles (group_id);

create index if not exists idx_zivosmedia_auth_audit_logs_app_integration_id
  on public.zivosmedia_auth_audit_logs (app_integration_id);
create index if not exists idx_zivosmedia_auth_codes_app_integration_id
  on public.zivosmedia_auth_codes (app_integration_id);
