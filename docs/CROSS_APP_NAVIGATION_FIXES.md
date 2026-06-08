# ZIVO Cross-App Navigation Fixes

Author: Claude · Date: 2026-06-07
Basis: Codex `CROSS_APP_NAVIGATION_AUDIT.md` (findings) + independent screenshot review across
mobile/tablet/desktop, reconciled with the live wiring in
`Zivo-Admin/config/connected-workflows.json` and the existing cross-app code in `zivosmedia`
(`src/lib/authRedirect.ts`, `src/lib/crossDomainSSO.ts`, `src/components/cross-app/CrossAppReturnBar.tsx`,
`src/config/zivoAdminDomain.ts`).

This is the **fixes/spec** layer that complements Codex's navigation **audit**. The recurring theme:
the cross-app *plumbing largely exists in config and lib code, but the UI never surfaces it*. Most of
these are "expose what's already wired," not "build from zero." Documentation only; no DNS, auth, or
deployment change approved here.

---

## The core gap

| What the audit found on screen | What actually exists in the repo | So the fix is |
| --- | --- | --- |
| No "Continue with Zivosmedia" button on any auth screen (0/124 screenshots) | `connected-workflows.json` already defines per-domain `loginHref` redirect chains; `crossDomainSSO.ts` has `buildHandoffUrl`/`goCrossDomain`; `AuthHandoff.tsx` receiver exists; `authRedirect.ts` has the `TRUSTED_ZIVO_AUTH_HOSTS` allowlist + open-redirect guard | Add the **button**; wire it to the existing handoff helpers and allowlist |
| No cross-app return path visible | `CrossAppReturnBar.tsx` exists | Mount the return bar on satellite entry points |
| Driver/Business/Employee show the generic hub feed | They are domains served by config, with no per-domain landing | Add per-domain landing pages |

---

## C1 — Add "Continue with Zivosmedia" everywhere  ·  P1
**Evidence:** Absent on `local/login/*`, `local/signup/*`, `public/zivoschat-com/desktop-1440.png`,
`public/zivosoftware-com/desktop-1440.png`, `public/zivostravel-com/ipad.png`. Chat is the only
surface that even hints at it — `public/zivoschat-com/desktop-1440.png` shows the **text** "Use your
ZIVO Media account," but there is no button to do so.
**Fix:** A single `<ContinueWithZivosmedia>` button (lives in the shared `<AuthShell>`, DS-3) that
calls `crossDomainSSO.buildHandoffUrl` / `goCrossDomain` and validates the target against
`TRUSTED_ZIVO_AUTH_HOSTS` in `authRedirect.ts`. For satellite apps it initiates the redirect chain
already encoded in `connected-workflows.json` (e.g. travel
`https://zivosmedia.com/login?redirect=…zivostravel.com/trips?source=zivosmedia`). Upgrade chat's
text hint to the real button first (lowest effort, highest symbolic value).
**Depends on:** identity foundation (`feature/zivosmedia-auth-foundation`, PKCE confidential-client —
see handoff). The button can ship in front of the inert flow as the canonical entry point.
**Acceptance:** Every login/signup (hub + travel + software + chat + driver) shows the button; target
host is allowlist-validated; no open-redirect; appears in screenshots on all three viewports.

## C2 — Give Driver / Business / Employee real per-domain entries  ·  P1 (Admin DNS = P0)
**Evidence:** `public/zivodriver-com/{desktop-1440,iphone-15-pro}.png`,
`public/zivobusiness-com/desktop-1440.png`, `public/zivoemployee-com/desktop-1440.png` all render the
identical hub feed shell; `public/zivodriver-com/iphone-15-pro.png` is the same "More Services" grid +
cookie modal as the hub.
**Impact:** These domains have no identity of their own, so there is nothing to navigate *to* or
*from* — cross-app flow is undefined for them.
**Fix:**
- **Driver:** real landing page (header, hero, how-it-works, connected workflow, earnings, support,
  legal) per the spec in Codex's `DRIVER_WEBSITE_AUDIT.md` / `ZIVO_UI_FIX_ROADMAP.md`. Include C1 +
  "Open ZivoChat" + return bar. Repo: `zivodriver`.
- **Business / Employee:** accurate holding/landing pages after repo+Supabase ownership is confirmed
  (per ecosystem canon, Business UI lives in `zivosmedia` business routes; Employee is greenfield).
  Until then, a truthful holding page beats impersonating the hub.
**Acceptance:** Each domain's first viewport identifies itself; no generic feed on driver/business/
employee roots.

## C3 — `zivoadmin.com` does not resolve  ·  P0
**Evidence:** All four `public/zivoadmin-com/*.png` captured `net::ERR_NAME_NOT_RESOLVED` (blank).
**Impact:** The admin control center is unreachable publicly; no cross-app monitoring entry exists.
**Fix:** Confirm DNS/Cloudflare mapping + deployment target for the admin app. **Owner approval
required before any DNS change — do not modify DNS as part of UI work.** `src/config/zivoAdminDomain.ts`
already defines `VITE_ADMIN_APP_URL` (default `https://admin.zivosmedia.com`); reconcile the intended
admin origin (`zivoadmin.com` vs `admin.zivosmedia.com`) before wiring admin links.
**Acceptance:** Admin domain resolves to the intended target; admin links in `connected-workflows.json`
`adminHref` anchors point at a reachable origin.

## C4 — Consistent "Open ZivoChat" support affordance  ·  P1
**Evidence:** Chat appears as a feed nav item (`local/home/desktop-1440.png`) and a standalone login
(`public/zivoschat-com/desktop-1440.png`), and `/support/new` exists
(`local/support-new/desktop-1440.png`), but there is no consistent "get support via ZivoChat" entry on
travel/driver/software/checkout/admin.
**Fix:** A shared `<OpenZivoChat context=…>` affordance placed in app headers/footers and on empty/
error states (notably travel checkout W5 and driver orders W6), carrying app + record context for the
future shared thread model (PR roadmap PR-10/11). Until the thread model exists, it can deep-link to
`/support/new` or the chat login with context preserved.
**Acceptance:** Every satellite app and key empty/error state exposes a consistent ZivoChat support
entry.

## C5 — Shared ZivoPay payment identity in the UI  ·  P1
**Evidence:** Wallet/checkout copy appears in travel/software, but no shared payment identity —
`local/travel-checkout/*`, `local/wallet/*`, `local/admin-payments-webhook-status/desktop-1440.png`,
driver payout absent.
**Fix:** A consistent ZivoPay label/affordance across checkout, wallet, admin webhook status, driver
payouts, and business billing, tied to the Zivosmedia identity. Per ecosystem canon the ZivoPay DB is
the hub (`slirphzzwcogdbkeicff`) — **get explicit owner confirmation before any payment schema/migration.**
UI labels and a provider-agnostic "ZivoPay" surface can precede the backend.
**Acceptance:** Payment surfaces share one ZivoPay identity and connect to the source app + Zivosmedia user.

## C6 — Surface cross-app return navigation  ·  P2
**Evidence:** After a cross-app jump there is no visible "return to where you came from" — not seen in
travel/driver/software captures.
**Fix:** Mount the existing `CrossAppReturnBar.tsx` on satellite entry points, fed by the `returnLabel`
values already in `connected-workflows.json` (e.g. "Travel return," "Driver auth," "Software connect").
**Acceptance:** Arriving from the hub shows a labeled return control on travel/driver/software.

---

## Reconciliation with `connected-workflows.json`
The config is the source of truth for cross-app wiring and is already fairly complete. The UI should
**read from it** rather than hardcode links:

| Domain | `loginHref` chain present? | `adminHref` anchor | `returnLabel` | UI gap to close |
| --- | --- | --- | --- | --- |
| zivosmedia.com | n/a (hub) | `#customer-lookup` | Identity home | Hub-level nav clarity |
| zivostravel.com | ✅ redirect→trips | `#travel-ops` | Travel return | C1 button, C6 return bar |
| zivosoftware.com | ✅ `/connect/software` | `#software-businesses` | Software connect | C1, business/software split |
| zivodriver.com | ✅ redirect→driver login | `#driver-ops` | Driver auth | C2 landing, C1, C4 |
| zivochat.com | ✅ `/chat?source=` | `#handoff-status` | Chat handoff | C1 button (text→button), C4 |
| zivopay.com | ✅ →`/payments` | `#connected-workflows` | Payment workflow | C5 identity |
| employees/business.zivosmedia.com | ✅ redirect | `#…` | Employee/Business module | C2 landing pages |

Net: the redirect chains, return labels, and admin anchors already exist. The cross-app work is
overwhelmingly **front-end exposure of existing wiring** (C1, C4, C6) plus the genuine net-new pieces
(C2 driver/business landing, C3 admin DNS, C5 ZivoPay). Sequencing in `PRIORITY_UI_ROADMAP.md`.
