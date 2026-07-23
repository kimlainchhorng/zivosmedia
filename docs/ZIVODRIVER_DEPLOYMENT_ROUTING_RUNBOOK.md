# Runbook — zivodriver.com (Dedicated Driver Deployment + Route Cutover)

**Issue:** `zivodriver.com` resolves and returns HTTP 200, but renders the **generic ZIVO super-app feed** instead of the Zivo Driver landing.
**Class:** deployment + route ownership. **The domain must point at the dedicated Driver app/repo, not the Zivosmedia super-app artifact.**
**This is a runbook, not a code change. No secrets are included.**

> **Current correction:** the earlier host-landing plan kept Driver public routing inside the Zivosmedia web app. The production architecture now treats `zivodriver.com` as a dedicated Driver surface. Zivosmedia may still link to Driver, but it must not own the `zivodriver.com/*` Cloudflare route or serve generic Zivosmedia HTML for that domain.

---

## 1. Expected configuration

| Field | Value |
|-------|-------|
| **Expected repo** | `kimlainchhorng/zivodriver` — the dedicated Driver web/native app and backend |
| **Related repo** | `kimlainchhorng/zivosmedia` links to Driver and owns the shared identity hub; it must not serve the Driver domain artifact |
| **Expected domain** | `zivodriver.com` (+ `www.zivodriver.com`) |
| **Expected deployment host** | A dedicated Driver deployment built from `/Users/kimlain/Documents/GitHub/zivodriver`, then bound to `zivodriver.com` + `www.zivodriver.com` |
| **Driver Supabase project** | `yiedlgoxwjmansszdypf` |

> Note: the Zivosmedia `zivo` Cloudflare Worker must not include `zivodriver.com/*` routes. If the live Cloudflare dashboard still binds `zivodriver.com` to the Zivosmedia worker, remove that binding only during the coordinated Driver cutover.

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

Ensure `zivodriver.com` is bound to the **Driver** deployment, not to the Zivosmedia worker/build.

---

## 3. Cloudflare Pages / Workers routes to verify

- No driver entry belongs in the Zivosmedia `zivo` Worker — **do not** add a Zivosmedia worker redirect or route for Driver.
- The Driver Cloudflare/Pages/Worker project must list `zivodriver.com` and `www.zivodriver.com` as **Active**.
- Verify the published Driver artifact is built from the `zivodriver` repo and renders the Driver app/landing, not the Zivosmedia feed.

---

## 4. Lovable publish status to verify

If production is still on Lovable:
1. Confirm whether `zivodriver.com` is attached to a Zivosmedia Lovable publish.
2. Prepare a dedicated Driver publish from the `zivodriver` repo.
3. Move the custom domain binding to that Driver publish during the cutover.
4. Confirm the last published artifact is the Driver app, not the Zivosmedia build.

---

## 5. Env vars needed

Use the Driver repo's deployment docs and environment contract. Do not set Driver production browser data routing by adding `zivodriver.com/*` to the Zivosmedia worker.

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
| Merge dedicated Driver deployment changes → `main` | Repo maintainer |
| Confirm which host serves `zivodriver.com` (Lovable vs Cloudflare) | Platform owner / Cloudflare admin |
| Republish (Lovable) or redeploy (Cloudflare Pages/Worker) the new build | Deploy owner |
| Bind/verify `zivodriver.com` custom domain on the publishing project | Cloudflare account admin (if Cloudflare) / Lovable domain owner |
| Cache purge after publish | Cloudflare account admin |
