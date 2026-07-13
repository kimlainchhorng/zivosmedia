# Runbook — zivodriver.com (Deployment + Host Routing)

**Issue:** `zivodriver.com` resolves and returns HTTP 200, but renders the **generic ZIVO super-app feed** instead of the Zivo Driver landing.
**Class:** deployment + host-routing. **The landing now exists in code; this is about getting the right build live on this host.**
**This is a runbook, not a code change. No secrets are included.**

> **Correction to the assumption "merged Driver landing":** there was no standalone driver landing in the deployed build. The driver landing is delivered by **host routing inside the zivosmedia web app** — component `src/pages/ZivoDriverHome.tsx`, rendered at `/` when `hostname === zivodriver.com`, with a `ZivoDriverHostGate` (see `src/App.tsx`). That work lives on branch **`feat/zivo-host-landings`**. `zivodriver.com` shows the generic feed because the build currently serving it predates that branch (it has no driver host branch, so it falls through to the default home). **Fix = merge `feat/zivo-host-landings` → main, rebuild, and republish the host that serves `zivodriver.com`.** No edge-worker redirect is needed — the SPA selects the driver home by hostname at `/`.

---

## 1. Expected configuration

| Field | Value |
|-------|-------|
| **Expected repo (web landing)** | `kimlainchhorng/zivosmedia` — the web app that serves `zivodriver.com` via host routing |
| **Related repo (native/driver app + backend)** | `kimlainchhorng/zivodriver` (separate; not what serves the public web landing) |
| **Expected domain** | `zivodriver.com` (+ `www.zivodriver.com`) |
| **Expected deployment host** | The production zivosmedia web app. Per `cloudflare/README.md`, production `zivosmedia.com` + alias hosts are currently published via **Lovable** (Lovable-managed DNS, mid-transition to Cloudflare). **Confirm** whether `zivodriver.com` is served by the Lovable publish or a Cloudflare Pages/Worker custom domain. |
| **Driver Supabase project** | `yiedlgoxwjmansszdypf` (used by the driver app backend — **not** required for the static landing) |

> Note: the `zivo` Cloudflare Worker (`wrangler.toml`) routes **only** `zivosoftware.com/*` and `zivostravel.com/*`. `zivodriver.com` is **not** in those routes, which is consistent with it being served by the Lovable production deployment. Confirm before assuming Cloudflare.

---

## 2. DNS records to verify

`zivodriver.com` already resolves (Cloudflare-fronted, HTTP 200), so DNS is not the blocker — but verify it points at the **same host as the production app** you intend to publish to.

```sh
nslookup zivodriver.com
nslookup www.zivodriver.com
curl -I https://zivodriver.com
```

| Record | Expectation |
|--------|-------------|
| `zivodriver.com` | A/CNAME → the production app host (Lovable host or Cloudflare Pages/Worker). Resolves, 200. |
| `www.zivodriver.com` | CNAME → apex (or same host). |

If the app is being moved Lovable → Cloudflare, ensure `zivodriver.com` is bound on the **same** project as the published build (else you publish to a host the domain doesn't point at).

---

## 3. Cloudflare Pages / Workers routes to verify

- No driver entry exists (or is needed) in the `zivo` Worker — **do not** add a worker redirect for driver. The SPA renders `ZivoDriverHome` at `/` from the hostname.
- If `zivodriver.com` is (or will be) served by Cloudflare: project → **Custom domains** must list `zivodriver.com` as **Active**, bound to the project that holds the published `dist` containing the merged landing.
- Verify the published `dist` is built from a commit that **includes `feat/zivo-host-landings`** (i.e., `src/pages/ZivoDriverHome.tsx` + the `/` host switch in `src/App.tsx`).

---

## 4. Lovable publish status to verify

If production is on Lovable:
1. Confirm the Lovable project is connected to `kimlainchhorng/zivosmedia` and tracks `main`.
2. Merge `feat/zivo-host-landings` → `main`.
3. **Republish** in Lovable so the new build (with the driver landing) goes live.
4. Confirm the Lovable "last published" commit is at/after the merge.

---

## 5. Env vars needed

**None for the landing.** `ZivoDriverHome` is static marketing + cross-domain links (`Continue with Zivosmedia` → `https://zivosmedia.com`; `ZivoChat` → `https://zivoschat.com`). No build-time env var is required to render it.
(The driver *backend* uses Supabase `yiedlgoxwjmansszdypf`, but that is out of scope for serving the public landing.)

---

## 6. Cache purge steps

1. After merge + publish: Cloudflare → zone/project for `zivodriver.com` → **Caching → Purge Everything** (or `zivodriver.com/*`).
2. If Lovable-hosted: republish invalidates the Lovable CDN; still hard-reload to bypass the browser cache.
3. Verify with a clean/incognito profile to avoid a cached `index.html`/asset bundle.

---

## 7. Live acceptance criteria

- [ ] `https://zivodriver.com/` renders heading **"Drive, deliver, and earn with Zivo Driver"** (not "Feed").
- [ ] "Become a driver", "Continue with Zivosmedia", and "ZivoChat" CTAs are visible.
- [ ] Driver-allowed paths stay on the driver host; unrelated paths redirect back to `/` (host gate).
- [ ] Desktop + mobile both render the driver landing; no console errors specific to the host.
- [ ] `zivodriver.com` no longer serves the generic super-app feed.

---

## 8. Who must do the manual dashboard action

| Action | Owner |
|--------|-------|
| Merge `feat/zivo-host-landings` → `main` | Repo maintainer |
| Confirm which host serves `zivodriver.com` (Lovable vs Cloudflare) | Platform owner / Cloudflare admin |
| Republish (Lovable) or redeploy (Cloudflare Pages/Worker) the new build | Deploy owner |
| Bind/verify `zivodriver.com` custom domain on the publishing project | Cloudflare account admin (if Cloudflare) / Lovable domain owner |
| Cache purge after publish | Cloudflare account admin |
