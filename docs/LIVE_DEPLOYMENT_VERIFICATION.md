# Live Deployment Verification — ZIVO hosts

**Date:** 2026-06-08 · **Method:** direct `curl` of the raw served HTML + response headers for each production host (not rendered/JS views), comparing the served `index-*.js` bundle hash and the presence of the removed `emrld.ltd` tracker (the repo's staleness litmus — `emrld` was deleted from `index.html` in commit `365f08ca5`, which also added the satellite host-landing pages/configs).

This pins down a question the redeploy runbook left open ("confirm whether production is Lovable- or Cloudflare-served"): **all hosts are now served by Cloudflare**, and the satellite "generic feed" defects are a **deployment-binding** problem, not a code problem.

## Verified state (point-in-time, 2026-06-08)

| Host | Served `index` bundle | `emrld` in HTML | Server | Verdict |
|------|----------------------|-----------------|--------|---------|
| zivosmedia.com | `index-CPxxpeBr.js` | 0 | cloudflare | ✅ **current** (post-`365f08ca5`) |
| zivostravel.com | `index-C_l-9YdQ.js` | 0 | cloudflare | ✅ clean (served by `zivo` Worker route) |
| zivosoftware.com | `302 →` (`/business`) | 0 | cloudflare | ✅ clean (served by `zivo` Worker route) |
| zivoschat.com | `302 →` (`/chat`) | 0 | cloudflare | ✅ clean |
| **zivodriver.com** | **`index-26I4Q6Yn.js`** | **1** | cloudflare | ❌ **stale build** |
| **zivobusiness.com** | **`index-26I4Q6Yn.js`** | **1** | cloudflare | ❌ **stale build** |
| **zivoemployee.com** | **`index-26I4Q6Yn.js`** | **1** | cloudflare | ❌ **stale build** |
| myzivo.com | `302 →` | 0 | **Kestrel** (not the Vite app) | ⚠️ different backend — out of scope here |
| app.zivosmedia.com | no response (`000`) | — | — | ⚠️ does not resolve/serve |

## Root cause (one cause, three domains)

`zivodriver.com`, `zivobusiness.com`, and `zivoemployee.com` all serve the **identical** older bundle `index-26I4Q6Yn.js`, which **still contains the `emrld` tracker** — i.e. it predates `365f08ca5` and therefore contains **none** of the satellite host-landing code. They are bound, in Cloudflare, to a **single stale Pages build/project**. That is exactly why all three render the generic super-app feed: the merged landing/host-detection code never reaches the browser on those hosts.

`zivosmedia.com` itself is current, so the code fixes already merged to `main` (host landings via `365f08ca5`, `/travel/checkout` provider fix, `/hotels` content) are live there.

## Routing topology (from `wrangler.toml`)

The `zivo` Cloudflare Worker declares routes only for `zivosoftware.com` and `zivostravel.com`. `zivosmedia.com` is bound (dashboard) to a **current** Pages project. `zivodriver.com` / `zivobusiness.com` / `zivoemployee.com` are **not** in the Worker routes and are bound to a **stale** Pages project.

## The fix (operational — Cloudflare dashboard; no code change)

The landing/routing code is already merged; **no source change makes these hosts correct.** Point the three stale domains at the current build, by any one of:

1. **Add `zivodriver.com`, `zivobusiness.com`, `zivoemployee.com` (+ `www`) as custom domains on the same current Cloudflare Pages project that serves `zivosmedia.com`** (recommended — single source of truth), **or**
2. **Re-publish the stale Pages project** those domains currently point at, from current `main`, **or**
3. **Add their routes to the `zivo` Worker `wrangler.toml`** (like travel/software) and redeploy the Worker — only viable after removing the conflicting Pages custom-domain bindings for those hosts.

After any of these, host detection (`isZivoBusinessHost` / `isZivoEmployeeHost` / the driver matcher in `src/App.tsx`) renders the correct landing immediately.

## Related

- `docs/ZIVOSMEDIA_REDEPLOY_RUNBOOK.md` — the redeploy procedure (its §0 table predates the host-landing merge; those landings are now in `main`).
- `docs/DOMAIN_BY_DOMAIN_FIX_PLAN.md` — per-domain actions.
- `docs/ZIVODRIVER_DEPLOYMENT_ROUTING_RUNBOOK.md` — driver host binding.

> Bundle hashes are a point-in-time snapshot; re-run the `curl` litmus (`emrld` count + `index-*.js` hash per host) after any rebind to confirm all three satellite hosts move off `index-26I4Q6Yn.js`.
