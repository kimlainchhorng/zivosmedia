# ZIVO Infra Fix Runbooks — zivoadmin (DNS) & zivodriver (deploy/host-routing)

**Date:** 2026-06-08 · Companion to `ALL_ZIVO_LIVE_WEBSITE_AUDIT.md`.
**Status:** Runbooks for **you to execute** — they need Cloudflare/DNS/registrar access and repo-ownership this session does not have. No production changes were made writing this.
**Guardrails:** no secrets/`.env` in the repo (set env in the Cloudflare/host dashboard); no direct pushes to `main`; one focused PR per change; do not touch auth/payment/migrations.

---

## Deployment topology (verified from `wrangler.toml` + `cloudflare/worker.ts`)
- **One build (`./dist`) + one worker (`cloudflare/worker.ts`, name `zivo`) serves almost everything.** Per-product UIs are produced **app-side** by hostname detection in `src/App.tsx`, not by separate deployments. (`zivostravel.com` is explicitly "served by the same build" — `cloudflare/worker.ts:86`.)
- The worker only special-cases: `CHAT_HOSTS → /chat` redirect, `SOFTWARE_HOSTS → /business…` redirect, and travel robots/sitemap. There is **no driver/business/employee/admin logic in the worker** — and none is needed, because `App.tsx` renders those landings at `/` via host detection.
- `App.tsx:1682` already routes `/` to `<ZivoDriverHome/>` / `<ZivoBusinessHome/>` / `<ZivoEmployeeHome/>` when the host matches (`isCurrentZivoDriverHost()` etc.), with `ZivoDriverHostGate` at `1588/1656`.
- **`wrangler.toml [[routes]]` only lists `zivosoftware.com` and `zivostravel.com`.** zivosmedia/zivoschat/zivodriver/zivobusiness/zivoemployee are **not** in the file yet still serve the app → their host→worker binding is managed in the **Cloudflare dashboard** (custom domains), not in `wrangler.toml`. Confirm this before deploying.

---

## RUNBOOK A — zivodriver.com (also unblocks zivobusiness.com & zivoemployee.com)

### Root cause (confirmed, not a guess)
zivodriver.com renders the generic **Feed** because the **live build is stale**. The driver landing wiring is **not in the deployed bundle and not even committed yet** — it is **uncommitted WIP** in the working tree of `feat/zivo-host-landings`:
- `git ls-files` → `src/pages/ZivoDriverHome.tsx`, `ZivoBusinessHome.tsx`, `ZivoEmployeeHome.tsx` are **untracked** (created 2026-06-08).
- `git show HEAD:src/App.tsx | grep ZivoDriverHome` → **0** matches; working-tree `src/App.tsx` → 2 matches (uncommitted, ~86 added lines).

So this is a **deployment/publish issue, not "write the landing from scratch"** — the landing exists locally; it must be committed, built, and shipped.

### Steps
1. **Finish & commit the host-landing WIP** on `feat/zivo-host-landings`:
   ```sh
   git add src/pages/ZivoDriverHome.tsx src/pages/ZivoBusinessHome.tsx src/pages/ZivoEmployeeHome.tsx src/App.tsx
   git commit -m "feat: host landings for zivodriver/zivobusiness/zivoemployee"
   ```
   (Untracked `ZivoDriverHome.tsx` etc. are new components — they must be added or the build will fail.)
2. **Verify locally per host** (simulate the production hostname):
   ```sh
   npm run build && npm run preview   # or: npx wrangler dev
   ```
   Hit the preview with a `zivodriver.com` Host header / hosts-file alias and confirm `/` shows the driver landing (not Feed). Repeat for business/employee. Re-run the audit harness (`scripts/tmp-live-audit.mjs`) against the preview if useful.
3. **Confirm the domain→worker binding.** In Cloudflare dashboard → Workers & Pages → the `zivo` worker → *Domains & Routes*: ensure `zivodriver.com` and `www.zivodriver.com` are attached to the **same** worker/Pages project that serves zivosmedia.com. If they currently point at an **older** Pages project/deployment, repoint them. (DNS for zivodriver.com **already resolves** via Cloudflare — this is binding/build, not DNS.)
   - Optionally add to `wrangler.toml` for reproducibility:
     ```toml
     [[routes]]
     pattern = "zivodriver.com/*"
     zone_name = "zivodriver.com"
     [[routes]]
     pattern = "www.zivodriver.com/*"
     zone_name = "zivodriver.com"
     ```
     (and the same for zivobusiness.com / zivoemployee.com once their zones are in this Cloudflare account).
4. **Add the driver/business/employee Supabase env vars** if the landings call Supabase (driver config expects `VITE_ZIVO_DRIVER_SUPABASE_URL` / `_PUBLISHABLE_KEY`, project `yiedlgoxwjmansszdypf`). Set these in the **dashboard**, never in the repo.
5. **Deploy** via your normal pipeline (merge PR → CI `wrangler deploy`, or manual `npx wrangler deploy`). Do **not** push to `main` directly.
6. **Verify live:** `curl -sI https://zivodriver.com` then render it — `/` heading should be the driver landing, `/join` should not fall through to Feed. The old "delivery partner app" placeholder must not appear (it already doesn't).

### Note on the worker
Driver/business/employee need **no** worker redirect (unlike chat/software) because the landing renders at `/` via app host detection. Only add a worker branch if you want a server-side redirect to a sub-path (e.g. `/driver`); the config already defines `ZIVO_DRIVER_APP_PATH = "/driver"` if you choose that pattern.

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
3. **Add `admin.zivosmedia.com` to the worker `allowedOrigins`** (`cloudflare/worker.ts` `DEFAULT_ALLOWED_ORIGINS` + `wrangler.toml [vars] ALLOWED_ORIGINS`) so cross-app handoffs/CORS from zivosmedia work. The admin `authPathPattern` (`/admin`) rate-limit branch already exists.
4. **(If keeping zivoadmin.com too)** Point `zivoadmin.com` DNS at Cloudflare and add a redirect rule `zivoadmin.com/* → https://admin.zivosmedia.com/$1`.
5. **Verify live** on desktop + mobile: a proper admin login or access-restricted page renders; no app-feed content; no unauthenticated data.

### Guardrails specific to admin
- Admin must be auth-gated before any DNS goes public. Do not expose staff tooling unauthenticated.
- No admin secrets/service-role keys in the repo or client bundle — server/edge only.

---

## Quick reference — what each domain actually needs

| Domain | Needs | Type | DNS already OK? |
|--------|-------|------|-----------------|
| zivodriver.com | Commit WIP landings → build → confirm worker binding → deploy | Deploy (not DNS) | ✅ resolves |
| zivobusiness.com | Same as driver (same WIP) | Deploy | ✅ resolves |
| zivoemployee.com | Same as driver (same WIP) | Deploy | ✅ resolves |
| zivoschat.com | Re-publish with `VITE_SUPABASE_URL`/`_PUBLISHABLE_KEY` set in dashboard | Config/deploy | ✅ resolves |
| **admin.zivosmedia.com** | Deploy Zivo-Admin app + create CNAME + allowedOrigins | DNS + deploy | ❌ NXDOMAIN |
| zivoadmin.com | (optional) DNS + redirect to admin.zivosmedia.com | DNS | ❌ NXDOMAIN |

**Not in these runbooks** (separate UI track): `/hotels` content (root cause now confirmed — `ZivoTravelHotelGate` in `App.tsx:1268` renders `CambodiaOnlyGate` on non-travel hosts) and `/travel/checkout` provider crash. Both live in `zivosmedia` and are code fixes, not infra.
