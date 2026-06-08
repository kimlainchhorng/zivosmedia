# ZIVO — Repo vs Live Fix Status (deployment-lag analysis)

**Date:** 2026-06-08 · Companion to `ALL_ZIVO_LIVE_WEBSITE_AUDIT.md` and `INFRA_FIX_RUNBOOKS.md`.
**Headline:** The single biggest root cause behind the audit's confirmed live defects is **deployment lag** — the production build is materially behind the repo. Several P0/P1 issues are **already fixed (or being fixed) in code but never shipped.** This means the fastest path to clearing most of the list is **deploy the current code**, not write new code.

> Audit/analysis only. No production, UI, auth, payment, or secret changes were made.

---

## Status of each confirmed defect: fixed-in-repo? deployed?

| Issue (from audit) | Fixed in repo? | Where | Deployed? | Action |
|--------------------|----------------|-------|-----------|--------|
| `/hotels` shows "Rides available in Cambodia" (P0) | ✅ **Yes** | branch `fix/hotels-route-content` @ `7a8ceb6f9` | ❌ No | **Review → merge → deploy** |
| `/travel/checkout` crash `useTravelCart…TravelCartProvider` (P1) | ✅ **Yes — in committed HEAD** | `App.tsx:2009` wraps route in `<TravelCartProvider>` | ❌ No (live still crashes) | **Deploy** (no code change) |
| zivodriver.com serves Feed not driver landing (P0) | ⚠️ **WIP, uncommitted** | untracked `src/pages/ZivoDriverHome.tsx` + uncommitted `App.tsx` wiring | ❌ No | Commit → build → deploy (see Runbook A) |
| zivobusiness.com serves Feed (P1) | ⚠️ WIP, uncommitted | `ZivoBusinessHome.tsx` (untracked) | ❌ No | same as driver |
| zivoemployee.com serves Feed (P1) | ⚠️ WIP, uncommitted | `ZivoEmployeeHome.tsx` (untracked) | ❌ No | same as driver |
| zivoschat.com missing Supabase env vars (P1) | n/a (config, not code) | dashboard env | ❌ | Set env → re-publish (Runbook A note) |
| zivoadmin.com NXDOMAIN (P0) | n/a (infra) | — | ❌ | DNS + host (Runbook B) |
| emrld.ltd third-party script on travel routes (P1 security) | ❓ **needs source hunt** | not located in repo grep | n/a | Investigate (below) |
| "Continue with Zivosmedia" / app-switcher / ZivoChat CTA absent (P1) | ❌ Not built | — | — | New shared components (later phase) |

**Takeaway:** 2 of the 3 P0s and the top P1 are *already coded*. A single up-to-date production deploy clears `/hotels`, `/travel/checkout`, and (after the WIP is committed) the three host landings.

---

## Evidence

### `/hotels` — fix exists and is correct
`fix/hotels-route-content` changes `ZivoTravelHotelGate` from:
```tsx
function ZivoTravelHotelGate({ children }) {
  if (isCurrentZivoTravelHost()) return <>{children}</>;
  return <CambodiaOnlyGate>{children}</CambodiaOnlyGate>;   // ← rendered the "Rides available in Cambodia" screen
}
```
to:
```tsx
// Hotels/resorts is a travel product, not the Cambodia-only rides product.
function ZivoTravelHotelGate({ children }) {
  return <>{children}</>;   // hotel routes always render hotel content
}
```
…plus a "Search" → "Search hotels" copy tweak in `HotelsLandingPage.tsx`, and before/after screenshots. The gate wraps all hotel routes (`/hotels`, `/hotels/:city`, `/hotel/:storeId`, `/hotels-list`), so the fix corrects every hotel surface, not just `/hotels`. **This is a clean, minimal, correct fix — it just hasn't been merged/deployed.**

### `/travel/checkout` — already fixed in HEAD
`git show HEAD:src/App.tsx` line 2009:
```tsx
<Route path="/travel/checkout" element={<RouteErrorBoundary section="Checkout"><TravelCartProvider><PhoneRequiredGate><TravelCheckoutPage /></PhoneRequiredGate></TravelCartProvider></RouteErrorBoundary>} />
```
The provider already wraps the page in committed code, yet the **live** site throws `useTravelCart must be used within a TravelCartProvider`. The only explanation is that production is serving an **older bundle** built before this wrapping landed. No code fix needed — deploy current `main`/HEAD.

### Deployment-lag conclusion
The live build predates: the checkout provider wrap (committed), the hotels gate fix (branch), and the host-landing work (WIP). Treat **"how stale is production, and what's the release cadence?"** as a first-class question — a stale deploy is silently re-breaking things the team already fixed.

---

## Recommended sequencing (in-repo, zivosmedia)
1. **Deploy current HEAD** → clears `/travel/checkout` immediately (already fixed) and confirms the pipeline works.
2. **Merge `fix/hotels-route-content` → deploy** → clears the `/hotels` P0 (smallest, lowest-risk PR; verify with the audit harness against all hotel routes).
3. **Commit the host-landing WIP → build → deploy** (per Runbook A) → clears driver/business/employee.
4. Parallel infra: zivoschat env re-publish; zivoadmin DNS+host (Runbook B).
5. Security: locate the `emrld.ltd` injector (see below).
6. Later phase: shared "Continue with Zivosmedia" + app-switcher + ZivoChat CTA components.

## emrld.ltd investigation pointer
`https://emrld.ltd/NDkzNzQ1.js` loaded (and was CSP-blocked) on `/flights`, `/hotels`, `/cars`. A repo grep did **not** find `emrld` in source, which raises the possibility it is injected at the edge/CDN, by a compromised dependency, or by a browser-side actor — **not** a first-party include. Before dismissing: check (a) the built `dist` assets and any analytics/tag-manager config, (b) Cloudflare transform/HTML rewrite rules, (c) third-party tag managers (GTM container) that could inject it. The CSP correctly blocks it today; the goal is to identify and remove the source.

---

## Verification (after each deploy)
Re-run the Playwright harness (`scripts/tmp-live-audit.mjs`) and confirm:
- `https://zivosmedia.com/hotels` heading = a Hotels landing (not "Rides available in Cambodia").
- `https://zivosmedia.com/travel/checkout` renders a cart (no "Checkout Error").
- `https://zivodriver.com/` renders the driver landing (not Feed).
- No `emrld.ltd` request attempted.
