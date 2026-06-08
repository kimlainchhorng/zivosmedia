# ZIVO Workflow Fixes

Author: Claude · Date: 2026-06-07
Basis: Codex live screenshot audit + independent review of `docs/ui-audit-screenshots/`
(mobile `iphone-13`/`iphone-15-pro`, tablet `ipad`, desktop `desktop-1440`).

Scope: user-flow / UX defects that block or frustrate a task, ordered by user impact. Each item is
grounded in a real screenshot, not in code reading alone. Documentation only — no production change
is approved here. Companion docs: `DESIGN_SYSTEM_RECOMMENDATIONS.md`,
`CROSS_APP_NAVIGATION_FIXES.md`, `PRIORITY_UI_ROADMAP.md`.

---

## W1 — `/hotels` renders the Rides geo-gate, not hotels  ·  P0
**Evidence:** `local/hotels/desktop-1440.png` (also `…/iphone-15-pro.png`) shows a location pin,
heading **"Rides available in Cambodia,"** body "ZIVO Rides currently operates in Cambodia only…",
and buttons **"Switch to Cambodia" / "Back to home."** This is the ZIVO Rides country-gate, served
under the Hotels route.
**Impact:** A hotels visitor hits a dead, off-topic wall. Total loss of the hotels funnel; also
implies a routing bug that could affect other product routes.
**Fix:** Confirm the `/hotels` route target component; restore the hotel search/landing. Verify the
country-gate is scoped to Rides only and is not wrapping sibling travel routes.
**Acceptance:** `/hotels` shows hotel search on all four viewports; no "Rides/Cambodia" copy; smoke
covers `/hotels`, `/flights`, `/cars`, `/bus` route→content mapping.
**Owner:** `zivosmedia`.

## W2 — Cookie consent blocks the first interaction (worst on mobile)  ·  P1
**Evidence:** Mobile modal consumes ~60% of the viewport over primary content —
`local/home/iphone-15-pro.png`, `public/zivodriver-com/iphone-15-pro.png`. On desktop it overlaps the
primary CTA — `local/home/desktop-1440.png`, `local/flights/desktop-1440.png` (covers the flight
search card), `local/hotels/desktop-1440.png`. Present on nearly every captured page.
**Impact:** The first thing every user must do is dismiss a banner that hides the task. Highest-
frequency friction in the whole product; also a measurable bounce/consent-rate drag.
**Fix:** Replace the large card with a compact, anchored consent bar that never overlaps the primary
CTA: smaller footprint, single line + Accept/Reject/Manage, bottom-anchored with safe-area padding,
and does not trap focus. Make it one shared `<ConsentBanner>` component (see DS-4) so the fix lands
across hub + travel + driver at once.
**Acceptance:** On `iphone-13`/`iphone-15-pro` the primary CTA of home/flights/checkout is visible
without dismissing consent; banner ≤ ~96px tall on mobile; keyboard focus order reaches page content.
**Owner:** `zivosmedia` (shared component; mirror to `zivodriver`, `ZIVO-CHAT`).

## W3 — Primary auth CTA looks disabled/broken on arrival  ·  P1
**Evidence:** `local/login/desktop-1440.png`, `local/login/iphone-15-pro.png`,
`local/signup/iphone-13.png`, `public/zivoschat-com/desktop-1440.png` — the "Log in"/"Sign up" button
is a pale peach→pink wash with low-contrast white text.
**Root cause:** empty form ⇒ raw `<button … disabled:opacity-40>` at 40% opacity (`src/pages/Login.tsx`).
**Impact:** Users can't tell the primary action is there/active; reads as a broken or pending button
on the very first screen of every auth flow.
**Fix:** See `DESIGN_SYSTEM_RECOMMENDATIONS.md` R1 — route through `<Button>`, give the disabled
state a legible token (not `opacity-40`). UX-side: the disabled control should still look like a
control with a clear reason it's inactive ("Enter your details to continue").
**Acceptance:** Enabled and disabled CTA both ≥ 4.5:1; the disabled reason is communicated.
**Owner:** `zivosmedia`.

## W4 — Protected routes redirect to a context-less login  ·  P1
**Evidence:** `/chat`, `/wallet`, `/settings`, `/shop-dashboard*`, `/admin/security`,
`/admin/payments/webhook-status`, `/travel` all land on the generic login —
`local/chat/desktop-1440.png`, `local/wallet/*`, `local/admin-security/iphone-15-pro.png`,
`local/admin-payments-webhook-status/desktop-1440.png`.
**Impact:** After redirect the user has lost the "why" — no module label, no "you're signing in to
manage payments/your wallet/admin." Disorienting, and worse for screen-reader/keyboard users.
**Fix:** Route-aware auth gate: pass the intended module into the login view and render a
module-specific heading + reassurance (e.g., "Sign in to ZivoPay wallet"). The redirect target is
already preserved in `connected-workflows.json` `loginHref` chains — surface it in copy. Pairs with
the "Continue with Zivosmedia" button (see cross-app doc).
**Acceptance:** Each protected route's login shows a module-specific heading and returns to intent
after auth.
**Owner:** `zivosmedia`.

## W5 — Travel checkout empty state is a dead end  ·  P1
**Evidence:** `local/travel-checkout/desktop-1440.png` (and `…/ipad.png`) — empty state only points
back to hotels, with consent overlapping the lower viewport; no payment-safe messaging, no support.
**Impact:** A user mid-purchase who lands here has no clear recovery, no "continue shopping," no help.
**Fix:** Recovery-oriented empty state: resume last search, browse flights/hotels/cars/bus, and an
**Open ZivoChat** support entry (cross-app doc); add ZivoPay-safe payment language once the payment
owner is confirmed.
**Acceptance:** Checkout empty state offers ≥2 forward paths + support; no consent overlap on mobile.
**Owner:** `zivosmedia`.

## W6 — Driver orders empty state explains nothing  ·  P1
**Evidence:** `local/driver-orders/desktop-1440.png`, `…/iphone-15-pro.png` — "no orders" with no
explanation of jobs, Travel→Driver requests, payout, or support.
**Impact:** A driver's core screen gives zero orientation when empty (which is the first-run state).
**Fix:** Job-aware empty state: what a job is, that Zivo Travel bookings can create driver jobs,
payout-status placeholder, and support. Depends on the Travel↔Driver contract (PR roadmap) for live
data; copy/empty-state can ship first.
**Acceptance:** Empty state explains jobs + payout + support; no generic "no orders available" alone.
**Owner:** `zivodriver` (UI), contract in `zivostravel`+`zivodriver`.

## W7 — Decide whether `/travel` is public or gated  ·  P1
**Evidence:** `local/travel/desktop-1440.png` redirects to login, while `/flights`, `/cars`, `/bus`
render publicly — inconsistent discoverability within the same module.
**Impact:** Hides the Travel landing/discovery behind auth while its children are open; confusing and
likely hurts top-of-funnel.
**Fix:** Product decision (owner): make `/travel` a public landing consistent with its children, or
intentionally gate all travel routes. Then align routing/guards.
**Acceptance:** Travel routes have a single, intentional auth posture.
**Owner:** `zivosmedia` + owner decision.

## W8 — Signup asks for too much before showing value  ·  P2
**Evidence:** `local/signup/iphone-13.png` — Email, First/Last name, Password, **DOB (Month/Day/Year)
"YOU MUST BE 18+"**, terms + 18+ checkbox, all before any account value is shown.
**Impact:** Dense first step on mobile; DOB/age-gating up front adds friction and abandonment.
**Fix:** Progressive disclosure — lead with "Continue with Zivosmedia" + email/password; collect DOB
and consents on a second step or only when a gated feature needs them.
**Acceptance:** First signup step ≤ 3 fields + SSO; age-gate deferred to when required.
**Owner:** `zivosmedia`.

## W9 — `/support/new` shows mixed global+travel nav  ·  P2
**Evidence:** `local/support-new/desktop-1440.png` — duplicated/competing navigation muddies the
support context.
**Impact:** Support entry feels like a leftover page rather than a focused help flow.
**Fix:** Give support a focused layout and convert it into a ZivoChat-aware support request (cross-app
doc).
**Acceptance:** Single coherent nav on support; clear "Open ZivoChat / contact support" path.
**Owner:** `zivosmedia`.

---

## Coverage note
Every item above was confirmed against captured screenshots on the stated viewports. Two QA gaps from
Codex's audit gate confident regression-testing of these fixes and should ship alongside:
`npm run test:visual` is unstable (server reset on `127.0.0.1:8080`), and `perf:media-report` flags 37
media-readiness issues (missing lazy-load/async-decode) — relevant to the image-heavy travel heroes
seen in `local/flights/*` and `public/zivostravel-com/*`.
