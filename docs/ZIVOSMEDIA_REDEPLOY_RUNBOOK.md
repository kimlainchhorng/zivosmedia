# Runbook — zivosmedia.com (Redeploy current `main`)

**Issue:** the live `zivosmedia.com` bundle is **stale** — it predates several fixes already committed to `main`. Most visibly it still ships the removed `emrld.ltd` tracker in `index.html`, and (depending on how far behind it is) the old `/travel/checkout` crash and `/hotels` content.
**Class:** deployment lag. **Cannot be fixed by writing more code — the fixes already exist in `main`; production is serving an older build. The fix is to republish `main`.**
**This is a runbook, not a code change. No secret values are included — only variable names and where to set them.**

> **Root cause is deployment lag, not source.** Per `docs/REPO_VS_LIVE_FIX_STATUS.md`, the single biggest cause of the audit's confirmed live defects is that production is materially behind the repo. A single up-to-date publish of `main` clears the issues in §0 at once. Verify "how stale is production / what is the release cadence?" as a first-class question.

---

## 0. What a redeploy of current `main` clears (and what it does NOT)

| Live defect | Fixed in `main`? | Where | Cleared by this redeploy? |
|-------------|------------------|-------|---------------------------|
| `emrld.ltd/NDkzNzQ1.js?t=493745` third-party script on travel pages | ✅ removed | commit `365f08ca5` ("remove tracker") deleted the inline loader + CSP allowlist entry from `index.html` (and the stray `eloquent-liskov-159913/index.html`). 0 references in current `main`. See `docs/EMRLD_SCRIPT_INJECTION_INVESTIGATION.md`. | ✅ Yes |
| `/travel/checkout` crash `useTravelCart must be used within a TravelCartProvider` | ✅ fixed | commit `2b71de4cf` wraps the route in `<TravelCartProvider>` (`src/App.tsx`). See `docs/REPO_VS_LIVE_FIX_STATUS.md`. | ✅ Yes |
| `/hotels` shows "Rides available in Cambodia" | ✅ fixed | merged via **PR #66** (`fix/hotels-route-content`) — `ZivoTravelHotelGate` no longer renders `CambodiaOnlyGate` on hotel routes. | ✅ Yes (if prod predates the merge) |
| `zivodriver.com` / `zivobusiness.com` / `zivoemployee.com` serve the generic feed | ⚠️ **separate branch** | host landings live on `feat/zivo-host-landings` (not yet in `main` at time of writing). | ❌ **No** — that branch must be merged first. See `docs/ZIVODRIVER_DEPLOYMENT_ROUTING_RUNBOOK.md` / `INFRA_FIX_RUNBOOKS.md` Runbook A. |
| `zivoadmin.com` NXDOMAIN | ❌ infra (DNS/host) | — | ❌ No — see `docs/ZIVOADMIN_DNS_DEPLOYMENT_RUNBOOK.md`. |
| `zivoschat.com` missing Supabase env warning | ❌ build-time env | publishing env | ❌ No (config) — see `docs/ZIVOSCHAT_ENV_DEPLOYMENT_RUNBOOK.md`. The same `VITE_SUPABASE_*` caveat (§5) applies to this publish. |

**Takeaway:** redeploying `main` is necessary and sufficient for the first three rows. The remaining rows need their own runbooks; do not expect this redeploy to fix them.

---

## 1. Expected configuration

| Field | Value |
|-------|-------|
| **Expected repo** | `kimlainchhorng/zivosmedia` (the flagship web build; `./dist` from one Vite build) |
| **Expected domain** | `zivosmedia.com` (+ `www.zivosmedia.com`); also fronts the alias hosts via in-app host detection in `src/App.tsx` |
| **Expected deployment host** | Production is currently **Lovable**-published (`cloudflare/README.md`: Lovable-managed DNS via Name.com, mid-transition to Cloudflare). **Confirm** whether `zivosmedia.com` is served by the Lovable publish or a Cloudflare Pages/Worker custom domain before republishing. |
| **Branch to ship** | `main` (all three §0 fixes are already merged into it) |
| **Supabase project (main)** | `slirphzzwcogdbkeicff` (shared main project) |
| **Worker** | `zivo` (`cloudflare/worker.ts`); `wrangler.toml [[routes]]` lists only `zivosoftware.com` + `zivostravel.com` — `zivosmedia.com` is bound via the **dashboard** (Lovable or Cloudflare custom domain), not `wrangler.toml`. |

---

## 2. DNS records to verify

`zivosmedia.com` already resolves and serves the app, so DNS is **not** the blocker — verify it points at the host you will republish to (so you don't publish to a host the domain doesn't reference).

```sh
nslookup zivosmedia.com
nslookup www.zivosmedia.com
curl -sI https://zivosmedia.com            # expect 200
```

| Record | Expectation |
|--------|-------------|
| `zivosmedia.com` | A/CNAME → the production app host (Lovable host **or** Cloudflare Pages/Worker). Resolves, 200. |
| `www.zivosmedia.com` | CNAME → apex / same host. |

> If the `zivosmedia.com` nameserver cutover to Cloudflare (`emerson.ns.cloudflare.com`, `lauryn.ns.cloudflare.com`) has completed, the host binding is in **Cloudflare**; otherwise it is still **Lovable/Name.com**. Confirm which is authoritative before publishing.

---

## 3. Cloudflare Pages / Workers routes to verify

- If `zivosmedia.com` is served by **Cloudflare**: the publishing project → **Custom domains** must list `zivosmedia.com` (+ `www`) as **Active**, bound to the project that holds the freshly built `dist`.
- Confirm the published `dist` is built from a commit that **includes** `365f08ca5` (emrld removal), `2b71de4cf` (checkout provider), and the PR #66 hotels merge — i.e., current `main` HEAD.
- The `/` → product-landing behavior (travel/chat/software/host detection) is handled **in-app** (`src/App.tsx`) and by the `zivo` worker for chat/software redirects — no route change is needed for this redeploy.

---

## 4. Publish / redeploy steps (the actual fix)

**If production is on Lovable (most likely):**
1. Open the Lovable project for `kimlainchhorng/zivosmedia` and confirm it tracks `main`.
2. Ensure `main` is current (it already contains all §0 fixes). No new code is required.
3. Confirm the `VITE_SUPABASE_*` env vars are set in the publishing env (§5) **before** building — a publish without them ships the bundled-fallback warning (the same root cause as the zivoschat issue).
4. **Re-publish.** The build is what bakes in the emrld removal and the checkout/hotels fixes — setting nothing else, a fresh publish of `main` is the fix.
5. Confirm the Lovable "last published" commit/timestamp is at/after current `main` HEAD.

**If production is on Cloudflare Pages/Workers:**
1. Trigger a fresh deploy from `main` (CI `wrangler deploy` / Pages build, or `npx wrangler deploy`). **Do not push to `main` directly.**
2. Confirm the new deployment is the **active** one and that `zivosmedia.com` is bound to it.

---

## 5. Env vars needed (names only — set in the publishing env, never commit values)

| Variable | Value source | Notes |
|----------|--------------|-------|
| `VITE_SUPABASE_URL` | `https://slirphzzwcogdbkeicff.supabase.co` | main project URL (not a secret) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → project `slirphzzwcogdbkeicff` → **Project Settings → API → Publishable/anon key** | **Publishable/anon key only.** `src/integrations/supabase/client.ts` throws if a service-role/secret key is supplied. Public-safe, but still set via env. |
| `VITE_SUPABASE_PROJECT_ID` (optional) | `slirphzzwcogdbkeicff` | client project identification |

> Vite inlines `VITE_*` at **build time** — set these before the build/publish, then re-publish. Do **not** put any service-role/secret key in a `VITE_*` variable (it would be inlined into client JS). `.env` files stay out of the repo.

---

## 6. Cache purge steps

`emrld.ltd` lived in **`index.html`** — the HTML **document** itself, not just a JS asset. A CDN/browser still caching the old `index.html` will keep serving the tracker reference even after a new build exists. So purge the **HTML**, not only hashed assets:

1. Re-publish/redeploy so a fresh `index.html` + asset bundle is produced.
2. Cloudflare → zone for `zivosmedia.com` → **Caching → Purge Everything** (or at least `https://zivosmedia.com/` and `https://zivosmedia.com/index.html`).
3. If Lovable-hosted: the republish invalidates the Lovable CDN; still hard-reload in an **incognito** profile (the old `index.html`/bundle hash may be cached locally).
4. Re-check that the new `index.html` no longer contains the `emrld.ltd` loader (view-source).

---

## 7. Live acceptance criteria

Re-run the live audit harness (`scripts/tmp-live-audit.mjs`) and/or check manually:

- [ ] **No** network request to `emrld.ltd/NDkzNzQ1.js` from `https://zivosmedia.com` (any route) — view-source of `index.html` has zero `emrld` references.
- [ ] `https://zivosmedia.com/travel/checkout` renders a checkout / empty-cart view, **not** "Checkout Error" and **no** `useTravelCart must be used within a TravelCartProvider` console error (direct navigation **and** refresh).
- [ ] `https://zivosmedia.com/hotels` shows a **Hotels & Resorts** landing (not "Rides available in Cambodia").
- [ ] No `[supabase/client] Missing VITE_SUPABASE_URL…` console warning (env vars baked into the build).
- [ ] Last-published commit/timestamp is at/after current `main` HEAD on the host that serves `zivosmedia.com`.
- [ ] Desktop + mobile both render correctly; no new console errors specific to the host.

---

## 8. Who must do the manual dashboard action

| Action | Owner |
|--------|-------|
| Confirm which host serves `zivosmedia.com` (Lovable vs Cloudflare) | Platform owner / Cloudflare admin |
| Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in the publishing env | Deploy/publish owner |
| Re-publish (Lovable) or redeploy (Cloudflare) the current `main` build | Deploy owner |
| Purge CDN cache (HTML included) after publish | Cloudflare account admin / Lovable domain owner |
| Verify live acceptance criteria (§7) | QA / platform owner |
| (Security follow-up) Confirm Lovable custom-code/GTM are not re-injecting `emrld.ltd`; consider a CI check that fails the build on non-allowlisted external scripts in `index.html` | Security / deploy owner — see `docs/EMRLD_SCRIPT_INJECTION_INVESTIGATION.md` |
