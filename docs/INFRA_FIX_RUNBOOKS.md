# ZIVO Infra Fix Runbooks — zivoadmin (DNS) & zivodriver (dedicated deploy cutover)

**Date:** 2026-06-08 · Companion to `ALL_ZIVO_LIVE_WEBSITE_AUDIT.md`.
**Status:** Runbooks for **you to execute** — they need Cloudflare/DNS/registrar access and repo-ownership this session does not have. No production changes were made writing this.
**Guardrails:** no secrets/`.env` in the repo (set env in the Cloudflare/host dashboard); no direct pushes to `main`; one focused PR per change; do not touch auth/payment/migrations.

---

## Deployment topology (verified from `wrangler.toml` + `cloudflare/worker.ts`)
- **One Zivosmedia build (`./dist`) + one worker (`cloudflare/worker.ts`, name `zivo`) serves the Zivosmedia-owned web surfaces.** Driver is no longer owned by that artifact.
- The worker only special-cases: `CHAT_HOSTS → /chat` redirect, `SOFTWARE_HOSTS → /business…` redirect, and travel robots/sitemap. There is **no admin logic in the worker**.
- `zivodriver.com` and `www.zivodriver.com` must be served by the dedicated Driver deployment built from `/Users/kimlain/Documents/GitHub/zivodriver`. Do not add those routes back to Zivosmedia `wrangler.toml`.
- Confirm the live Cloudflare dashboard does not still bind `zivodriver.com/*` to the Zivosmedia `zivo` worker before claiming Driver production routing is fixed.

---

## RUNBOOK A — zivodriver.com dedicated Driver cutover

### Root cause (confirmed, not a guess)
zivodriver.com renders generic Zivosmedia content when the domain is bound to the Zivosmedia artifact instead of the dedicated Driver artifact.

### Steps
1. **Build and verify the dedicated Driver app** from `/Users/kimlain/Documents/GitHub/zivodriver`:
   ```sh
   npm run build
   ```
2. **Confirm the Zivosmedia worker does not own Driver.** In Cloudflare dashboard → Workers & Pages → the `zivo` worker → *Domains & Routes*: `zivodriver.com/*` and `www.zivodriver.com/*` must be absent.
3. **Bind Driver to its dedicated project.** Attach `zivodriver.com` and `www.zivodriver.com` to the Driver deployment only.
4. **Deploy** via the Driver pipeline. Do not republish the Zivosmedia artifact as the Driver domain fix.
5. **Verify live:** `curl -sI https://zivodriver.com`, then render `/` and `/join` — both must show the Driver app/landing, not Zivosmedia Feed.

### Note on the worker
Driver needs **no** Zivosmedia worker redirect or route. Its public domain belongs to the dedicated Driver deployment.

---

## RUNBOOK B — zivoadmin.com (DNS + hosting; true outage)

### Root cause
**No DNS record exists.** `zivoadmin.com`, `www.zivoadmin.com`, and `admin.zivosmedia.com` all return **NXDOMAIN**. Nothing is served. (No private data is exposed — there is simply no host.)

### Decision required first — which hostname is canonical?
The codebase and the docs disagree:
- **Code** (`src/config/zivoAdminDomain.ts`): `FALLBACK_ADMIN_ORIGIN = "https://admin.zivosmedia.com"` — the main app deep-links staff to **admin.zivosmedia.com** (overridable via `VITE_ADMIN_APP_URL`).
- **Docs** (`docs/DOMAINS_AND_REPOS.md`): lists **zivoadmin.com**.

**Recommendation:** make **`admin.zivosmedia.com`** canonical (matches the code with zero app changes; it's a subdomain of an existing zone, so DNS is trivial). Keep `zivoadmin.com` as an optional redirect to it. If you prefer `zivoadmin.com` as canonical, you must also set `VITE_ADMIN_APP_URL=https://zivoadmin.com` at build time so the app links there.

### Steps (recommended path: admin.zivosmedia.com)
1. **Stand up the admin app.** The admin control plane is the separate **Zivo-Admin** repo (returned 404 in this session — confirm access/ownership first). Deploy it (Cloudflare Pages/Workers or your chosen host) behind **proper staff auth** — it must show an admin login or an "access restricted" page, never public admin data.
2. **Create DNS** in the `zivosmedia.com` Cloudflare zone:
   - Add a proxied `CNAME admin → <admin-deployment-target>` (or `A`/`AAAA` to the host). Cloudflare-proxied (orange cloud) for TLS + WAF.
   - Verify: `dig +short admin.zivosmedia.com` returns records; `curl -sI https://admin.zivosmedia.com` returns a real status (200/302/401), not connection failure.
3. **Confirm the Worker safe-origin deployment vars keep the Admin hosts** (`cloudflare/worker.ts` `DEFAULT_ALLOWED_ORIGINS` + `wrangler.toml [vars] ALLOWED_ORIGINS` already include `admin.zivosmedia.com`, `zivoadmin.com`, and `www.zivoadmin.com`) so cross-app handoffs/CORS from the dedicated Admin app work. The admin `authPathPattern` (`/admin`) rate-limit branch already exists.
4. **(If keeping zivoadmin.com too)** Point `zivoadmin.com` DNS at Cloudflare and add a redirect rule `zivoadmin.com/* → https://admin.zivosmedia.com/$1`.
5. **Verify live** on desktop + mobile: a proper admin login or access-restricted page renders; no app-feed content; no unauthenticated data.

### Guardrails specific to admin
- Admin must be auth-gated before any DNS goes public. Do not expose staff tooling unauthenticated.
- No admin secrets/service-role keys in the repo or client bundle — server/edge only.

---

## Quick reference — what each domain actually needs

| Domain | Needs | Type | DNS already OK? |
|--------|-------|------|-----------------|
| zivodriver.com | Build/publish dedicated Driver app → confirm Zivosmedia Worker binding absent → bind apex + `www` to Driver | Deploy/cutover | ✅ resolves |
| zivobusiness.com | Same as driver (same WIP) | Deploy | ✅ resolves |
| zivoemployee.com | Same as driver (same WIP) | Deploy | ✅ resolves |
| zivoschat.com | Re-publish with `VITE_SUPABASE_URL`/`_PUBLISHABLE_KEY` set in dashboard | Config/deploy | ✅ resolves |
| **admin.zivosmedia.com** | Deploy Zivo-Admin app + create CNAME + allowedOrigins | DNS + deploy | ❌ NXDOMAIN |
| zivoadmin.com | (optional) DNS + redirect to admin.zivosmedia.com | DNS | ❌ NXDOMAIN |

**Not in these runbooks** (separate UI track): `/hotels` content (root cause now confirmed — `ZivoTravelHotelGate` in `App.tsx:1268` renders `CambodiaOnlyGate` on non-travel hosts) and `/travel/checkout` provider crash. Both live in `zivosmedia` and are code fixes, not infra.
