-- Supabase grants service_role table DML through default privileges when a
-- public table is created. CutLuy mutations must go through the guarded
-- security-definer RPCs, so retain direct read access only.

begin;

revoke all on table public.lodging_cutluy_payments from service_role;
revoke all on table public.lodging_cutluy_webhook_events from service_role;
revoke all on table public.lodging_cutluy_manual_actions from service_role;

grant select on table public.lodging_cutluy_payments to service_role;
grant select on table public.lodging_cutluy_webhook_events to service_role;
grant select on table public.lodging_cutluy_manual_actions to service_role;

commit;
