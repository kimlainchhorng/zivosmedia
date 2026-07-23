# Zivo "Continue with Zivosmedia" — provisioning & go-live runbook

**Date:** 2026-06-07 · **Author:** Claude (architect). **Run order:** AFTER zivodriver.com
deployment is verified live and the `/hotels` P0 is fixed (per owner sequence). The identity
foundation is **already built but INERT** — this flips it live. Model: **all four apps =
Path-B** (owner ruling; chat short-circuits on shared `slirph`). Companions:
[`zivo-cross-app-identity-decisions-2026-06-07.md`](./zivo-cross-app-identity-decisions-2026-06-07.md),
[`AUTH_FLOW.md`](./AUTH_FLOW.md), [`API_CONTRACT.md`](./API_CONTRACT.md).

> Do nothing here in production without backups + staging-first. Use PRs, not direct `main`.

## Phase 0 — consolidate the unmerged branches
The foundation is scattered; assemble it into reviewable PRs first:
- Hub (zivosmedia): cherry-pick the auth commits off `docs/live-ui-visual-audit` →
  `a9e92780b` (authorize route), `d3cc29277` + `66d1fd096` (webhook emitter) onto a feature
  branch; also the parallel session's `feature/zivosmedia-auth-foundation` (migration + edge fns).
- Driver: `feature/zivosmedia-auth-bridge` (client wiring + exchange + receivers + migrations).
- Travel/Software: their `feature/zivosmedia-auth-*` branches.

## Phase 1 — apply migrations (staging → prod, per project)
- Hub `slirphzzwcogdbkeicff`: `20260607161643_zivosmedia_auth_foundation.sql`
  (`app_integrations`, `zivosmedia_auth_codes`, `zivosmedia_auth_audit_logs`,
  `platform_webhook_events`).
- Driver `yiedlgoxwjmansszdypf`: bridge migration + the hardening migrations
  (`harden_driver_metric_security`, `harden_auth_relay_tokens_rls`).
- Travel `xbllvmpomorawkcrtbcq`, Software `ydxztoresbdeoeijhxww`: their bridge migrations
  (+ software `harden_update_updated_at_search_path`).
- Run `get_advisors(security)` on each after applying.

## Phase 2 — secrets (never commit; set via dashboard/CLI)
Per relying-party app (driver/travel/software/Ride):
- `ZIVOSMEDIA_AUTH_CLIENT_SECRET` — a fresh random secret (store the **raw** value here).
- `ZIVO_AUTHORITY_SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co` (the hub).
- `ZIVOSMEDIA_WEBHOOK_SECRET` — shared HMAC secret (same value on the hub emitter + all apps).
- Driver also: `ZIVO_DRIVER_ADMIN_API_TOKEN` (admin-linked-user).
- Ride uses `ZIVO_RIDE_AUTH_CLIENT_SECRET` in the shared Ride/Driver project
  (`yiedlgoxwjmansszdypf`) and
  `ZIVO_AUTHORITY_SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co`.
Hub (zivosmedia) emitter: `ZIVOSMEDIA_WEBHOOK_SECRET` + the standard `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY`.
Rotate the leaked driver `VITE_GOOGLE_MAPS_API_KEY` while here (it's still in git history).

## Phase 3 — provision `app_integrations` (hub, after secrets exist)
Store only the **SHA-256 hash** of each client secret; set the per-event `webhook_url`
template (`{event}` → `user-updated`/`user-disabled`); then enable. Requires `pgcrypto`.

```sql
create extension if not exists pgcrypto;

-- Repeat per app. :client_secret = the SAME raw value you put in that app's
-- ZIVOSMEDIA_AUTH_CLIENT_SECRET env. :webhook_url uses the {event} placeholder.
update public.app_integrations set
  client_secret_hash = encode(digest(:client_secret, 'sha256'), 'hex'),
  webhook_url        = :webhook_url,
  status             = 'enabled',
  enabled            = true,
  updated_at         = now()
where app_key = :app_key;
```

Concrete `webhook_url` templates:
- `zivo_driver`   → `https://yiedlgoxwjmansszdypf.supabase.co/functions/v1/zivosmedia-{event}`
- `zivo_software` → `https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/zivosmedia-{event}`
- `zivo_travel`   → `https://zivostravel.com/webhooks/zivosmedia/{event}`
- `zivo_chat`     → short-circuits on shared `slirph`; no cross-project webhook needed.
- `zivo_ride`     → identity exchange only for the initial release; no hub webhook URL.

### ZIVO Ride enablement

Apply `20260722192749_zivo_ride_sso_integration.sql` on the hub first. It
registers `zivo_ride` as `configuration_pending`/disabled and adds a database
constraint that rejects partial enablement or a non-SHA-256 secret hash. Then
provision one fresh, high-entropy raw secret in the Ride backend and store only
its lowercase SHA-256 hash in the hub:

**Current live status (2026-07-22):** the hub registration migration is applied
on `slirphzzwcogdbkeicff`; `app_integrations.app_key='zivo_ride'` exists with
`status='configuration_pending'`, `enabled=false`, and no stored secret hash.
The Ride exchange Edge Function on `yiedlgoxwjmansszdypf` is deployed and reaches
the hub; a fake-code smoke test is rejected with "App integration is not
enabled", which is the expected locked state until the matching secret hash is
written below. Do not enable this row until the raw
`ZIVO_RIDE_AUTH_CLIENT_SECRET` value currently deployed to the Ride backend is
available, or until that backend secret is rotated and the new hash is written
in the same release window.

```bash
# Ride/Driver project (yiedlgoxwjmansszdypf). Never set this as VITE_*.
npx supabase secrets set ZIVO_RIDE_AUTH_CLIENT_SECRET="<fresh-random-secret>" --project-ref yiedlgoxwjmansszdypf
npx supabase secrets set ZIVO_AUTHORITY_SUPABASE_URL="https://slirphzzwcogdbkeicff.supabase.co" --project-ref yiedlgoxwjmansszdypf
```

```sql
-- Hub project (slirphzzwcogdbkeicff). Run in one transaction.
begin;
create extension if not exists pgcrypto;

update public.app_integrations
set
  client_secret_hash = encode(digest('<same-fresh-random-secret>', 'sha256'), 'hex'),
  status = 'enabled',
  enabled = true,
  updated_at = now()
where app_key = 'zivo_ride';

-- Must return enabled=true, status=enabled, and a 64-character hash.
select app_key, status, enabled, length(client_secret_hash) as secret_hash_length
from public.app_integrations
where app_key = 'zivo_ride';
commit;
```

If the raw secret is available in a local shell, generate the same hub SQL
without printing the raw value:

```bash
ZIVO_RIDE_AUTH_CLIENT_SECRET="<same-fresh-random-secret>" npm run supabase:zivo-ride-sso-enable-sql
```

Do not place the raw value in this repository, a browser `VITE_*` variable, a
migration, or the hub database. Roll back instantly with
`status='disabled', enabled=false`; retain or rotate the hash before re-enabling.

### Zivo Software local callback testing

For local testing from `http://127.0.0.1:5173`, apply the zivosmedia migration
`20260613224500_zivo_software_sso_local_redirects.sql`. It appends:

- `http://localhost:5173/auth/zivosmedia/callback`
- `http://127.0.0.1:5173/auth/zivosmedia/callback`

It only flips `zivo_software` to enabled if `client_secret_hash` is already a
64-character SHA-256 hash. To complete go-live, use the same raw secret in both places:

```bash
# Software project (ydxztoresbdeoeijhxww)
npx supabase secrets set ZIVO_MEDIA_APP_CLIENT_SECRET="<raw-secret>" --project-ref ydxztoresbdeoeijhxww
npx supabase secrets set ZIVO_MEDIA_VALIDATE_CODE_URL="https://slirphzzwcogdbkeicff.supabase.co/functions/v1/zivosmedia-auth-validate-code" --project-ref ydxztoresbdeoeijhxww
npx supabase secrets set ZIVO_MEDIA_ANON_KEY="<zivosmedia-anon-key>" --project-ref ydxztoresbdeoeijhxww
```

```sql
-- Hub project (slirphzzwcogdbkeicff)
create extension if not exists pgcrypto;

update public.app_integrations
set
  client_secret_hash = encode(digest('<raw-secret>', 'sha256'), 'hex'),
  status = 'enabled',
  enabled = true,
  updated_at = now()
where app_key = 'zivo_software';
```

## Phase 4 — verify (staging first)
1. From a product app, click "Continue with Zivosmedia" → hub `/auth/zivosmedia/authorize`
   → back to the app's callback → `exchange` → local link. Confirm a row in that app's
   `linked_zivosmedia_users` and a success row in `zivosmedia_auth_audit_logs`.
2. Trigger the hub emitter (`zivosmedia-user-event-dispatch`, service-role) for a test user;
   confirm the app's receiver updates the linked row and writes `platform_webhook_events`.
3. Negatives: reused code → rejected; bad `state` → rejected (client); tampered webhook sig
   → 401.
4. Only set `enabled=true` in production after staging passes for that app.

## Rollback
Set `enabled=false` / `status='disabled'` in `app_integrations` to instantly disable an app's
flow (the issue/validate functions gate on it) without code changes.
