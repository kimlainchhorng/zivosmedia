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

## Current repo status
- `zivosmedia` is the current all-in-one app and already contains travel, business/software, driver, chat, and admin surfaces.
- `zivosmedia` now has a generated ownership audit (`docs/zivosmedia-domain-ownership-audit.md`) and an aggregator boundary contract (`docs/zivosmedia-aggregator-boundary.md`) for deciding what stays in the all-in-one platform.
- `zivodriver` is a real app and now targets the dedicated Driver Supabase URL by default; live Driver foundation migrations and compatibility migrations are applied. It still needs the Driver publishable key and Edge Function secrets in env.
- `zivostravel` is a small Vite app with Travel backend inventory/cutover docs and live foundation tables on the Travel project.
- `zivosoftware` has Software/business inventory/cutover docs and a live Software project with business/store and auto-repair tables.
- `Zivo-Admin` has an admin migration inventory and control-plane implementation doc; it should become the server-backed staff dashboard for all products.
- `ZIVO-CHAT` is a real app and still targets the main/shared Zivo backend unless separately split later.

## Verified Supabase status on 2026-06-06
- `slirphzzwcogdbkeicff` / `zivo`: active healthy. Table listing timed out from the connector because the project is large; migrations and many active Edge Functions confirm it is the current live authority for mixed travel, driver, business, chat, payment, maps, restaurant/order, hotel, salon, car-rental, bot, and platform workflows.
- `xbllvmpomorawkcrtbcq` / `Zivo Travel`: active healthy. Contains Travel foundation tables: backend links, service catalog, search events, partner workflows, and sync runs. No Travel Edge Functions are active yet.
- `ydxztoresbdeoeijhxww` / `Zivo software`: active healthy. Contains business/software tables including store, booking, and auto-repair structures. Active functions include `csp-report`, `geo-detect`, `exchange-rates`, and `software-media-handoff`.
- `yiedlgoxwjmansszdypf` / `Zivo Driver`: active healthy. Driver foundation and compatibility migrations are applied. Active functions include `driver-me`, `driver-go-online`, `driver-go-offline`, `location-heartbeat`, `register-push-token`, `driver-onboard`, `driver-signup`, `verify-otp`, and `generate-otp`.

## Centralized identity pattern (the hard part — do this FIRST per domain)
- **Auth client = always the main project** (`slirph`): login / session / refresh happen there. One account, one `auth.users`.
- **Data client = the per-domain project**, created with supabase-js v2 `accessToken: () => <main session access_token>` so it sends the main-project JWT. RLS on the per-domain project then sees the same user.
- Each per-domain project must be set with the **same JWT secret + issuer as `slirph`** (Supabase Dashboard → Auth → JWT) so main-issued tokens validate there.
- **RLS on per-domain projects uses JWT claims (`auth.uid()`), NOT local `auth.users`** (users are not replicated). Reference `user_id` columns + `auth.uid()`; avoid joins to `auth.users`/`profiles` unless those are mirrored.
- Net: the client is now a **dual client** — `authClient` (main) + `dataClient` (per-domain); **auth stays on main** and only **data** routes per host (see Code touch-points below).

## Per-domain data
- Each project gets its vertical's **schema** (tables, RLS, RPC, triggers, indexes, storage buckets) + **data** migrated from `slirph`.
- Use `pg_dump`/Supabase branching for schema; export/import data per vertical with **backups + a freeze/sync window** + reconciliation.

## Aggregation (zivosmedia "share from all")
- zivosmedia reads from each per-domain project. Options: **(a)** edge functions on `slirph` that call each project's REST/RPC with a read key and aggregate (recommended — flexible, isolated); **(b)** Postgres FDW (read-only foreign tables) for heavy joins; **(c)** scheduled CDC/sync into a `slirph` aggregate schema.
- First bridge added: `supabase/functions/zivo-domain-summary`, with frontend helper `src/lib/zivoDomainSummary.ts`. Driver, Travel, and Software summary RPC migrations are applied on their dedicated projects.
- Live status: `zivo-domain-summary` is deployed to `slirphzzwcogdbkeicff` as version 3 with `verify_jwt=false`; the function validates the main Zivo Bearer token inside the handler. Anonymous smoke test returns `401 Unauthorized`, confirming the route is reachable without exposing data.
- Live secrets: `ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY`, `ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY`, and `ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY` are configured on the main ZivosMedia project. Values are intentionally not committed or documented.
- RPC verification: Driver, Travel, and Software each expose the expected security-invoker summary RPC signature `p_user_id uuid, p_limit integer default 10`; none of the bridge RPCs are `security definer`.

## Phased plan (safe order — nothing destructive until its project is ready)
1. **PILOT — Zivo Driver** (`yiedl`, empty/new = lowest risk): set shared JWT secret → provision driver schema → build the dual-client (auth=main, data=yiedl, claims-RLS) → wire `zivodriver.com` host-switch (data only) → migrate driver data **after backup** → verify one-account login + driver flows + aggregation to zivosmedia.
2. **Travel** (`xbllv`): same pattern; flip `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND` **only after** schema + data + shared JWT are in place.
3. **Software** (`ydxz`): already host-switched; align it to shared JWT + claims-RLS; migrate business-software data.
4. **Aggregation layer** on zivosmedia (edge functions / FDW).
5. zivoschat / zivobusiness / zivoemployee: create projects + repeat, or keep on main.

## Guardrails
- **Do NOT flip a domain's dedicated-backend routing until** its project has schema + data + the shared JWT secret (else: empty data + auth failures).
- **Back up before every data move.** Prototype on a Supabase branch first.
- **Payments:** keep ZivoPay / Zivosmedia Payments **central on `slirph`** initially. Stripe is the default provider; use Checkout for one-time payments, Billing for subscriptions/invoices, and Connect only after the owner approves marketplace payouts. Per-domain apps create payment requests, but canonical payment customers, orders, transactions, subscriptions, invoices, refunds, payouts, webhook logs, and audit logs stay central.
- `pk_live` Stripe key is wired — never run live payment tests casually.

## Code touch-points
- `src/integrations/supabase/client.ts` — now exposes `authSupabase` for main-project auth, `dataSupabase` for active domain data, and a compatibility `supabase` export whose `.auth` routes to main while `.from()` / `.functions` / `.storage` route to active domain data.
- `src/config/zivoDriverDomain.ts` — added for `zivodriver.com`; data routing to `yiedlgoxwjmansszdypf` is gated by `VITE_ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY` so the browser bundle does not flip before the key is configured.
- `src/config/` — business/employee/chat/admin dedicated-project domain configs now exist (`zivoBusinessDomain.ts`, `zivoEmployeeDomain.ts`, `zivoChatDomain.ts`, `zivoAdminDomain.ts`) alongside `zivoTravelDomain.ts`, `zivoDriverDomain.ts`, and `autoRepairDomain.ts`.

## Immediate next migration work
1. Add the missing Driver publishable key and Edge Function secrets, then verify the Driver app against `yiedlgoxwjmansszdypf`.
2. Move new ZivosMedia code to explicit `authSupabase` / `dataSupabase` imports, then gradually replace ambiguous `supabase` imports in Travel, Software, Driver, and Admin surfaces.
3. Run an authenticated `zivo-domain-summary` smoke test with a test user token and verify Driver, Travel, and Software return domain statuses.
4. Scaffold `Zivo-Admin` as a server-backed control plane and move Driver staff/admin screens first.
5. Move Travel workflows in order: bus booking, rental car customer booking, hotels/resorts customer booking, flights, then checkout/wallet/refunds/payouts.
6. Move Software workflows starting with auto repair because `ydxztoresbdeoeijhxww` already has `ar_*` structures, then broaden into store/business verticals.
