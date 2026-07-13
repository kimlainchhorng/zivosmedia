# Runbook — zivoadmin.com / admin.zivosmedia.com (DNS + Deployment)

**Issue:** the admin control plane is unreachable on the web — `zivoadmin.com`, `www.zivoadmin.com`, and `admin.zivosmedia.com` all return **NXDOMAIN**.
**Class:** infrastructure (DNS + hosting). **Cannot be fixed in application code.**
**This is a runbook, not a code change. No secrets are included — only variable names and where to set them.**

> **Canonical host decision (2026-06-08):** the canonical admin host is **`admin.zivosmedia.com`** — this is what every code reference uses (`src/config/zivoAdminDomain.ts` `FALLBACK_ADMIN_ORIGIN`, the admin registry `config/platform-registry.json`). `zivoadmin.com` is an **optional vanity alias** that should 301-redirect to the canonical host (or be dropped). Do **not** repoint code to `zivoadmin.com` without a separate decision.

---

## 1. Expected configuration

| Field | Value |
|-------|-------|
| **Expected repo** | `kimlainchhorng/Zivo-Admin` (separate control-plane app; not the zivosmedia web build) |
| **Expected canonical domain** | `admin.zivosmedia.com` |
| **Optional alias** | `zivoadmin.com` / `www.zivoadmin.com` → 301 → `admin.zivosmedia.com` |
| **Expected deployment host** | **Not yet deployed.** Registry `apiBaseUrl` is `http://localhost:5190` and `deploymentTarget: "Needs confirmation"` — admin is currently **local-only by design**. A hosting target must be chosen before it can go live. |
| **Supabase project (admin)** | `wtdlbzgryuelpylijnkd` (health path `/healthz`) |
| **Status today** | `admin` registry entry: `enabled: true`, `visibleInControlPlane: false`, `status: active` (local), public host unbound |

### Decision gate (do this first)
**Public vs local-only.** If the admin dashboard is meant to stay an internal/local tool, the NXDOMAIN is *expected* — update the registry note and stop here. If a hosted admin is intended, continue with the steps below. (Recommended hosting: a dedicated **Cloudflare Pages** project, e.g. `zivo-admin`, bound to `admin.zivosmedia.com`, kept behind auth + IP/email allowlist since it is a control plane.)

---

## 2. DNS records to verify

`admin.zivosmedia.com` lives under the `zivosmedia.com` zone. Per `cloudflare/README.md`, `zivosmedia.com` DNS is **currently managed by Lovable** (Name.com nameservers); the Cloudflare zone exists but is initializing. So the record must be created **wherever DNS for `zivosmedia.com` is authoritative right now**.

| Record | Type | Target | Notes |
|--------|------|--------|-------|
| `admin.zivosmedia.com` | CNAME (proxied if Cloudflare) | the Pages/Worker hostname (e.g. `zivo-admin.pages.dev`) | Create once the admin app is deployed |
| `zivoadmin.com` (optional) | A/CNAME or Redirect Rule | → 301 to `https://admin.zivosmedia.com` | Needs its **own zone** (separate apex registration) |
| `www.zivoadmin.com` (optional) | CNAME → `zivoadmin.com` | redirect to apex | |

Verify after change:
```sh
nslookup admin.zivosmedia.com
curl -I https://admin.zivosmedia.com
```
Expected: resolves to the host IP; HTTP 200/302 (not "Could not resolve host").

> If the `zivosmedia.com` nameserver cutover to Cloudflare (`emerson.ns.cloudflare.com`, `lauryn.ns.cloudflare.com`) has completed, create the record in **Cloudflare DNS**; otherwise create it in **Lovable/Name.com DNS**. Confirm which is authoritative before adding the record.

---

## 3. Cloudflare Pages / Workers routes to verify

- The `zivo` Worker (`wrangler.toml`) routes **only** `zivosoftware.com/*` and `zivostravel.com/*` — it does **not** serve admin. Do not add the admin host to the `zivo` worker.
- If hosting admin on **Cloudflare Pages**: Pages project → **Custom domains** → add `admin.zivosmedia.com` (binds the route automatically).
- If hosting admin on a dedicated **Worker**: add a route `admin.zivosmedia.com/*` bound to the admin worker (separate from `zivo`).
- Verify: Cloudflare dashboard → the admin project → Custom Domains shows `admin.zivosmedia.com` as **Active**.

---

## 4. Lovable publish status

**Not applicable.** The admin app is the separate `Zivo-Admin` repo, not the Lovable-published zivosmedia web app. Lovable does not deploy it. (Only note: cross-app deep links from the zivosmedia web app to admin are governed by `VITE_ADMIN_APP_URL` — see §5.)

---

## 5. Env vars needed (names only — set in dashboard/CI, never commit)

| Variable | Where | Purpose |
|----------|-------|---------|
| `ADMIN_SUPABASE_URL` | Zivo-Admin server/deploy env | admin Supabase project URL (`wtdlbzgryuelpylijnkd`) |
| `ADMIN_SUPABASE_SERVICE_ROLE_KEY` | Zivo-Admin **server-side only** | privileged backend access — **never** expose client-side |
| `VITE_ADMIN_APP_URL` | zivosmedia build env (optional) | overrides the cross-app admin origin; default already `https://admin.zivosmedia.com` |

No secret **values** belong in the repo. Obtain keys from Supabase Dashboard → project `wtdlbzgryuelpylijnkd` → Project Settings → API.

---

## 6. Cache purge steps

1. After deploy + DNS, Cloudflare → the admin project/zone → **Caching → Purge Everything** (or purge `admin.zivosmedia.com/*`).
2. Re-trigger the admin app deploy so the latest build is live.
3. Hard-reload in a clean browser profile to bypass local cache.

---

## 7. Live acceptance criteria

- [ ] `nslookup admin.zivosmedia.com` resolves (no NXDOMAIN).
- [ ] `https://admin.zivosmedia.com` returns an **admin login or "access restricted"** page (not a generic site, not the super-app feed).
- [ ] `https://admin.zivosmedia.com/healthz` (or registry `healthPaths`) returns 200.
- [ ] No private admin data is exposed pre-auth (control plane stays behind auth + allowlist).
- [ ] If `zivoadmin.com` is used, it 301-redirects to `admin.zivosmedia.com`.
- [ ] Cross-app "Admin queue" deep links from the web app resolve to the live host.

---

## 8. Who must do the manual dashboard action

| Action | Owner |
|--------|-------|
| Decide public-vs-local-only for admin | Platform owner |
| Choose + create hosting (Cloudflare Pages `zivo-admin` or Worker) | Cloudflare account admin |
| Create `admin.zivosmedia.com` DNS record (in the currently-authoritative DNS) | DNS owner (Lovable/Name.com **or** Cloudflare) |
| Register/redirect `zivoadmin.com` (if used) | Registrar account holder |
| Set `ADMIN_SUPABASE_*` env in the Zivo-Admin deploy env | Zivo-Admin deploy owner |
| Cache purge after go-live | Cloudflare account admin |
