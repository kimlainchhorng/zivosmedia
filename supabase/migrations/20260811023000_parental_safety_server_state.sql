-- Parental-safety settings, server-owned.
--
-- WHY THIS EXISTS: `SafetyCenterPage.tsx` presents parental controls — a
-- 4-digit PIN, a content filter, a screen-time limit, and a set of protection
-- toggles — and stores ALL of it in localStorage under a device-local key. The
-- "PIN" is persisted only as a `hasPin: true` boolean: the digits are never
-- stored, so nothing can ever verify them; "Require PIN for age-restricted
-- content" is a client-side boolean any device wipe (or DevTools) removes; and
-- none of it follows the account to a second device. The safety board item is
-- explicit: move these claims behind authenticated server state before more
-- safety UI is added on top of them.
--
-- SHAPE: identical to the two_step_auth / user_passcode pair this project
-- already runs (20260426141249 + 20260601070000 server gate):
--   - the owner may SELECT their row (the client verifies the salted PIN hash
--     locally, exactly as the app passcode does),
--   - every direct client write is blocked by RESTRICTIVE false policies,
--   - writes happen only inside the account-security-settings Edge Function
--     (service role), which binds user_id from the verified JWT.
--
-- The PIN is stored as a client-side salted hash (pin_hash + pin_salt), the
-- same contract as user_passcode.passcode_hash: the server never sees raw
-- digits. A 4-digit PIN hash is not cryptographically strong and is not
-- pretending to be — the property this table adds is that the settings and the
-- verifier SURVIVE the device and cannot be edited by the child account the
-- controls are aimed at.

create table if not exists public.parental_safety_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Toggle map keyed by the SafetyCenterPage toggle ids. jsonb rather than
  -- columns so adding a toggle is a client change, not a migration; unknown
  -- keys are harmless and ignored by readers.
  toggles jsonb not null default '{}'::jsonb,
  screen_time text not null default 'none'
    check (screen_time in ('none', '30m', '1h', '2h', '4h')),
  content_filter text not null default 'standard'
    check (content_filter in ('relaxed', 'standard', 'strict')),
  -- Salted PIN verifier, client-hashed like user_passcode. Both present or
  -- both absent: a hash without its salt is unverifiable dead weight.
  pin_hash text check (pin_hash is null or length(pin_hash) between 32 and 512),
  pin_salt text check (pin_salt is null or length(pin_salt) between 16 and 256),
  updated_at timestamptz not null default now(),
  constraint parental_pin_hash_salt_together
    check ((pin_hash is null) = (pin_salt is null))
);

alter table public.parental_safety_settings enable row level security;

-- Owner reads their own row; the client verifies the PIN hash locally.
drop policy if exists "Owner reads parental safety" on public.parental_safety_settings;
create policy "Owner reads parental safety"
  on public.parental_safety_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Direct client writes are blocked outright — RESTRICTIVE, matching the
-- 20260601070000 server gate on two_step_auth / user_passcode. Writes belong
-- to the account-security-settings function so user_id scoping, validation,
-- and the login_alerts audit row happen server-side.
drop policy if exists "parental_safety_block_direct_insert" on public.parental_safety_settings;
create policy "parental_safety_block_direct_insert"
  on public.parental_safety_settings
  as restrictive
  for insert
  to authenticated
  with check (false);

drop policy if exists "parental_safety_block_direct_update" on public.parental_safety_settings;
create policy "parental_safety_block_direct_update"
  on public.parental_safety_settings
  as restrictive
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "parental_safety_block_direct_delete" on public.parental_safety_settings;
create policy "parental_safety_block_direct_delete"
  on public.parental_safety_settings
  as restrictive
  for delete
  to authenticated
  using (false);

revoke all on table public.parental_safety_settings from anon;
grant select on table public.parental_safety_settings to authenticated;
grant all on table public.parental_safety_settings to service_role;

comment on table public.parental_safety_settings is
  'Parental safety settings (toggles, screen time, content filter, salted PIN verifier); client writes are blocked and trusted server-side ingestion via account-security-settings is required.';
