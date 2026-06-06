# Zivo multi-domain architecture & migration runbook

Date: 2026-06-06 · Owner decisions **LOCKED**.

## Vision
7 domains. Each domain controls its vertical on its **own** Supabase project. **zivosmedia.com is the all-in-one aggregator + the identity authority** (it "gets a share from all").

## Locked owner decisions
1. **Identity = ONE ZIVO account across all domains.** Auth always runs on the **main** project; per-domain projects **trust** that identity (shared JWT + claims-based RLS). One login works on every domain; cross-domain SSO (`/auth/handoff`) keeps working.
2. **Data = per-domain projects own their vertical; zivosmedia federates** a read-only aggregate.

## Domain → project → vertical
| Domain | Supabase ref | Owns |
|---|---|---|
| **zivosmedia.com** | `slirphzzwcogdbkeicff` (main) | All-in-one aggregator · **identity authority** · payments hub |
| **zivostravel.com** | `xbllvmpomorawkcrtbcq` | Flights · Hotels · Rental Car · Booking Bus |
| **zivosoftware.com** | `ydxztoresbdeoeijhxww` | Business-page software (Hotels&Resorts, Food&Drink, Shopping&Markets, Auto, Transport, Beauty&Wellness, Services — full category list) |
| **zivodriver.com** | `yiedlgoxwjmansszdypf` (new) | Drivers only |
| zivoschat.com | TBD (main for now) | Chat |
| zivobusiness.com | TBD (main for now) | Business |
| zivoemployee.com | TBD (main for now) | Employee |

## Centralized identity pattern (the hard part — do this FIRST per domain)
- **Auth client = always the main project** (`slirph`): login / session / refresh happen there. One account, one `auth.users`.
- **Data client = the per-domain project**, created with supabase-js v2 `accessToken: () => <main session access_token>` so it sends the main-project JWT. RLS on the per-domain project then sees the same user.
- Each per-domain project must be set with the **same JWT secret + issuer as `slirph`** (Supabase Dashboard → Auth → JWT) so main-issued tokens validate there.
- **RLS on per-domain projects uses JWT claims (`auth.uid()`), NOT local `auth.users`** (users are not replicated). Reference `user_id` columns + `auth.uid()`; avoid joins to `auth.users`/`profiles` unless those are mirrored.
- Net: refactor the client into a **dual client** — `authClient` (main) + `dataClient` (per-domain). `client.ts` currently switches the *whole* client per host; that must change so **auth stays on main** and only **data** routes per host.

## Per-domain data
- Each project gets its vertical's **schema** (tables, RLS, RPC, triggers, indexes, storage buckets) + **data** migrated from `slirph`.
- Use `pg_dump`/Supabase branching for schema; export/import data per vertical with **backups + a freeze/sync window** + reconciliation.

## Aggregation (zivosmedia "share from all")
- zivosmedia reads from each per-domain project. Options: **(a)** edge functions on `slirph` that call each project's REST/RPC with a read key and aggregate (recommended — flexible, isolated); **(b)** Postgres FDW (read-only foreign tables) for heavy joins; **(c)** scheduled CDC/sync into a `slirph` aggregate schema.

## Phased plan (safe order — nothing destructive until its project is ready)
1. **PILOT — Zivo Driver** (`yiedl`, empty/new = lowest risk): set shared JWT secret → provision driver schema → build the dual-client (auth=main, data=yiedl, claims-RLS) → wire `zivodriver.com` host-switch (data only) → migrate driver data **after backup** → verify one-account login + driver flows + aggregation to zivosmedia.
2. **Travel** (`xbllv`): same pattern; flip `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND` **only after** schema + data + shared JWT are in place.
3. **Software** (`ydxz`): already host-switched; align it to shared JWT + claims-RLS; migrate business-software data.
4. **Aggregation layer** on zivosmedia (edge functions / FDW).
5. zivoschat / zivobusiness / zivoemployee: create projects + repeat, or keep on main.

## Guardrails
- **Do NOT flip a domain's dedicated-backend routing until** its project has schema + data + the shared JWT secret (else: empty data + auth failures).
- **Back up before every data move.** Prototype on a Supabase branch first.
- **Payments:** recommend keeping payments **central on `slirph`** initially (per-project Stripe = split payouts/reconciliation). Decide explicitly before moving payment tables.
- `pk_live` Stripe key is wired — never run live payment tests casually.

## Code touch-points
- `src/integrations/supabase/client.ts` — refactor to dual client (auth on main; data per host). Currently switches the whole client (software live; travel gated; no driver).
- `src/config/` — add `zivoDriverDomain.ts` (+ later business/employee/chat) mirroring `zivoTravelDomain.ts` / `autoRepairDomain.ts`.
