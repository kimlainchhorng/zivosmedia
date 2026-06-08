# ZIVO — Ready-to-Execute Actions (copy-paste)

**Date:** 2026-06-08 · Turns the audit/runbooks into actions you can run directly. Nothing here was executed — all require your deploy/DNS/GitHub access. Order = fastest impact first.

---

## ACTION 1 — Deploy current `main`/HEAD (fixes `/travel/checkout`, ~0 risk)
The checkout crash is already fixed in committed code (`App.tsx:2009` wraps the route in `<TravelCartProvider>`); production is just stale. A plain redeploy clears it.
```sh
# from a clean main checkout, with Cloudflare creds configured
npm ci && npm run build
npx wrangler deploy            # deploys cloudflare/worker.ts + ./dist
```
**Verify:** `https://zivosmedia.com/travel/checkout` renders a cart, not "Checkout Error".

---

## ACTION 2 — Merge `fix/hotels-route-content` (fixes `/hotels` P0, verified)
4-line, verified fix (gate stops wrapping hotel routes in `CambodiaOnlyGate`). Suggested PR:

> **Title:** `fix: render hotels content on /hotels (stop Cambodia rides gate)`
>
> **Body:**
> Fixes the P0 from the live audit: `zivosmedia.com/hotels` rendered the "Rides available in Cambodia" geo-gate instead of hotel content.
> Root cause: `ZivoTravelHotelGate` wrapped all hotel routes in `<CambodiaOnlyGate>` on non-travel hosts. This change makes the gate always render hotel content; `CambodiaOnlyGate` stays reserved for ride/drive routes.
> Affects `/hotels`, `/hotels/:city`, `/hotel/:storeId`, `/hotel/:storeId/book`, `/hotel/:storeId/booking-confirmed`, `/hotels-list`.
> Verified: before/after screenshots (desktop + mobile) show the "Find your perfect stay — Hotels & Resorts" landing with search/filters/destinations. See `docs/REPO_VS_LIVE_FIX_STATUS.md`.

```sh
# do NOT push to main directly — open a PR
gh pr create --base main --head fix/hotels-route-content \
  --title "fix: render hotels content on /hotels (stop Cambodia rides gate)" \
  --body-file <paste body above>
# after review + merge:
npx wrangler deploy
```
**Verify:** `https://zivosmedia.com/hotels` shows the hotels landing; the four other hotel routes too.

---

## ACTION 3 — Ship the host landings (fixes zivodriver/business/employee)
The landings are **uncommitted WIP** in your working tree (untracked `src/pages/ZivoDriverHome.tsx`, `ZivoBusinessHome.tsx`, `ZivoEmployeeHome.tsx` + uncommitted `App.tsx` wiring). Finish, then:
```sh
git add src/pages/ZivoDriverHome.tsx src/pages/ZivoBusinessHome.tsx src/pages/ZivoEmployeeHome.tsx \
        src/config/zivoBusinessDomain.ts src/config/zivoEmployeeDomain.ts src/App.tsx
git commit -m "feat: host landings for zivodriver/zivobusiness/zivoemployee"
npm run build                  # confirm the new components compile/bundle
# open PR -> review -> merge -> deploy
```
**Pre-deploy check:** confirm `zivodriver.com` / `zivobusiness.com` / `zivoemployee.com` are bound to the **same** worker/Pages project as zivosmedia (Cloudflare → the `zivo` worker → Domains & Routes). They're not in `wrangler.toml [[routes]]` — binding is dashboard-managed. (See `INFRA_FIX_RUNBOOKS.md` Runbook A.)
**Verify:** each domain's `/` renders its landing, not the Feed.

---

## ACTION 4 — zivoschat.com: set Supabase env vars + re-publish
Console shows it running on the bundled fallback. Set on the **zivoschat build/host** (dashboard, not the repo):
```
VITE_SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the publishable/anon key for that project>
```
**Guardrail:** `client.ts:104` rejects a secret/service-role key — use the **publishable/anon** key only. Then re-publish.
**Verify:** browser console on `https://zivoschat.com` no longer logs "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY".

---

## ACTION 5 — zivoadmin: DNS + host (canonical `admin.zivosmedia.com`)
See `INFRA_FIX_RUNBOOKS.md` Runbook B. Summary: deploy the Zivo-Admin app behind staff auth, add a proxied `CNAME admin` in the `zivosmedia.com` zone, add `admin.zivosmedia.com` to `ALLOWED_ORIGINS`, optionally redirect `zivoadmin.com` → it.
**Verify:** `dig +short admin.zivosmedia.com` resolves; the host shows an admin login / access-restricted page, never app-feed or unauthenticated data.

---

## ACTION 6 — Security: find the `emrld.ltd` script source
Not present in repo source. Check, in order: built `dist` assets; the GTM/tag-manager container; Cloudflare transform/HTML-rewrite rules; any analytics include. CSP blocks it today; goal is to identify and remove the injector. Do not whitelist it in CSP.

---

## Re-verify the whole set after deploys
```sh
node scripts/tmp-live-audit.mjs    # re-renders all domains/paths -> scripts/tmp-audit-results.json + screenshots
```
Expected post-deploy: `/hotels` = hotels, `/travel/checkout` = cart, `zivodriver.com/` = driver landing, no `emrld.ltd` request, zivoschat console clean.
