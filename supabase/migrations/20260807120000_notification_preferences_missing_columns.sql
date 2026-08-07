-- notification_preferences: add the columns the app has always written.
--
-- `notification-preferences-update` upserted push_enabled, quiet_hours_enabled,
-- quiet_hours_start, quiet_hours_end, sms_consent_text and sms_consent_at.
-- None of them exist on the live table, and PostgREST rejects an entire request
-- over one unknown column — so NO notification preference change ever saved,
-- including the ones whose columns do exist (email/sms/in_app/marketing).
--
-- The edge function has been corrected to write only real columns so that the
-- working preferences persist today. Applying this migration restores the rest:
-- afterwards, re-add the fields to `cleanPreferencePatch` and the upsert
-- defaults in supabase/functions/notification-preferences-update/index.ts.
--
-- `send-push-notification` also filters on push_enabled, so push gating is
-- inert until this lands: every subscriber is treated as opted in.

alter table if exists public.notification_preferences
  add column if not exists push_enabled boolean not null default true,
  add column if not exists quiet_hours_enabled boolean not null default false,
  add column if not exists quiet_hours_start time,
  add column if not exists quiet_hours_end time,
  add column if not exists sms_consent_text text,
  add column if not exists sms_consent_at timestamptz;

comment on column public.notification_preferences.push_enabled is
  'Per-user push opt-in. send-push-notification filters on this.';
comment on column public.notification_preferences.sms_consent_at is
  'When the user granted SMS consent. Compliance record — do not backfill.';

-- Quiet hours are only meaningful as a pair.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_preferences_quiet_hours_pair_check'
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_quiet_hours_pair_check
      check (
        (quiet_hours_start is null) = (quiet_hours_end is null)
      );
  end if;
end $$;
