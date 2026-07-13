# ZIVO Priority UI Roadmap

Author: Claude · Date: 2026-06-07
Basis: synthesis of the Codex live screenshot audit (`LIVE_WEBSITE_UI_AUDIT.md` and siblings) with
independent screenshot verification across mobile/tablet/desktop, expressed as a sequenced plan.

This roadmap is the umbrella over three companion docs and is **complementary to** Codex's
`ZIVO_UI_FIX_ROADMAP.md` and `PR_ROADMAP.md` — it does not replace them. Codex's roadmaps are a flat
P0/P1/P2 catalog and a 12-PR backend build order; this one adds the missing dimensions: **dependency
ordering, design-system-first sequencing, and an impact/effort lens**, so the team knows *what to do
in what order and why*.

Companion docs:
- `DESIGN_SYSTEM_RECOMMENDATIONS.md` (DS-1…DS-5)
- `WORKFLOW_FIXES.md` (W1…W9)
- `CROSS_APP_NAVIGATION_FIXES.md` (C1…C6)

Documentation only. No production UI/auth/payment/DNS/deployment change is approved here. Owner-gated
items (DNS, payments, identity model) are flagged.

---

## The one idea that orders everything

> Fix the **foundation** (consent banner, the `<Button>`/auth-CTA bypass, the per-app `--brand`
> token, the shared `<AuthShell>`) before the **surfaces**. The audit's long P1 list — "Continue with
> Zivosmedia," driver/business landing pages, ZivoChat support, ZivoPay context, route-aware auth
> gates — almost all render *through* those foundation pieces. Build the foundation once and the
> surfaces inherit a consistent, accessible look instead of each re-inventing a pale gradient button.

Dependency chain:

```
DS-4 ConsentBanner ─┐
DS-1 Button/auth CTA ─┼─► DS-3 AuthShell ─► C1 Continue-with-Zivosmedia ─► C2 driver/business landing
DS-2 --brand token ──┘                    └─► W4 route-aware auth gates   └─► C4 ZivoChat / C5 ZivoPay
```

---

## P0 — Broken / unavailable (do first, this week)

| ID | Item | Impact | Effort | Owner | Gate |
| --- | --- | --- | --- | --- | --- |
| W1 | Fix `/hotels` rendering the Rides "Cambodia" geo-gate | Hotels funnel is dead | S | `zivosmedia` | — |
| C3 | Restore `zivoadmin.com` resolution (DNS/deploy target) | Admin unreachable | S–M | Admin/Cloudflare | **Owner approves DNS** |
| QA | Stabilize `npm run test:visual` (server reset on :8080) | No visual regression gate for any fix below | M | `zivosmedia` | — |

Rationale: W1 and C3 are availability failures, not polish. The QA fix is listed at P0 because every
P1 UI change below needs a working visual-test gate to ship safely (Codex flagged 28 failed / server
refused).

## P1 — Foundation (unlocks the rest)

| ID | Item | Impact | Effort | Owner | Depends on |
| --- | --- | --- | --- | --- | --- |
| DS-1 | Auth CTAs → `<Button>`; fix disabled-state legibility; ban `bg-ig-gradient` on surfaces | Every auth screen's primary action stops looking broken | S | `zivosmedia` | — |
| DS-4 | Compact shared `<ConsentBanner>` (W2) | Removes the #1 first-impression blocker on every page/app | M | `zivosmedia` | — |
| DS-2 | Per-app `--brand` token + `data-app` seam; delete `isZivoSoftwareDomain` style branches | Ends the "3 different brands" fragmentation | M | `zivosmedia` | — |
| DS-3 | Shared `<AuthShell>` + `<BrandLockup>` | One home for SSO + consistent auth | M | `zivosmedia` | DS-1, DS-2 |
| C1 | "Continue with Zivosmedia" button (wire to existing handoff + allowlist) | Cross-app identity becomes real in UI | M | `zivosmedia` | DS-3; identity foundation |
| W4 | Route-aware auth gates (module heading + preserved intent) | Orientation on every protected route | S–M | `zivosmedia` | DS-3 |

## P1 — Surfaces (after foundation lands)

| ID | Item | Impact | Effort | Owner | Depends on |
| --- | --- | --- | --- | --- | --- |
| C2 | Driver landing page (+ Business/Employee holding pages) | Driver/business/employee stop impersonating the hub | M–L | `zivodriver`, `zivosmedia` | DS-1..3, C1; repo/Supabase ownership for biz/emp |
| C4 | Consistent "Open ZivoChat" support affordance | Support reachable across apps & empty states | M | `zivosmedia` (+apps) | DS-3 |
| C5 | Shared ZivoPay payment identity (checkout/wallet/webhook/payouts) | One payment identity across funnels | M | `zivosmedia` | **Owner confirms payment DB owner** |
| W5 | Travel checkout recovery empty state | Recovers stuck buyers | S | `zivosmedia` | C4 |
| W6 | Driver orders job-aware empty state | First-run driver orientation | S | `zivodriver` | Travel↔Driver contract for live data |
| W3 | Auth CTA disabled-state UX copy | Reinforces DS-1 | S | `zivosmedia` | DS-1 |
| DS-5 | Publish tokens/preset to `zivodriver` + `ZIVO-CHAT` | Off-build apps match | M | all | DS-2 |

## P2 — Coherence & clarity

| ID | Item | Impact | Effort | Owner |
| --- | --- | --- | --- | --- |
| W7 | Decide `/travel` public vs gated; align routing | Travel discoverability | S | owner + `zivosmedia` |
| W8 | Progressive-disclosure signup (SSO first, defer DOB/age-gate) | Lower signup friction | M | `zivosmedia` |
| W9 | Focused `/support/new` layout (ZivoChat-aware) | Cleaner support entry | S | `zivosmedia` |
| DS-4b | `<ServiceTile>` icon set replacing emoji on "More Services" | Less casual, accessible, theme-aware | M | `zivosmedia` |
| C6 | Mount `CrossAppReturnBar` on satellite entries | Visible return path | S | `zivosmedia` |
| D5 | Standardize brand lockup + ZIVO casing | Brand consistency | S | `zivosmedia` |

## P3 — Polish & debt

| ID | Item | Owner |
| --- | --- | --- |
| D6 | Reconcile `--sidebar-primary` (emerald) with app `--primary` (black) | `zivosmedia` |
| D7 | Standardize control radius (`rounded-xl`); remove ad-hoc raw-element radii | `zivosmedia` |
| Perf | Resolve 37 `perf:media-report` issues (lazy-load/async-decode) on image-heavy travel heroes | `zivosmedia` |
| Legal | Simpler `/legal/privacy` shell (de-emphasize feed nav) | `zivosmedia` |
| Employee | Employee-specific content once Business/Admin roles are defined | TBD |

---

## Owner decisions blocking specific tracks
1. **Brand strategy (DS-2):** unified ZIVO masterbrand with per-vertical accent (recommended) vs
   independent sub-brands. Determines whether travel-blue/software-green become accents on one shell.
2. **DNS for `zivoadmin.com` (C3):** confirm target (`zivoadmin.com` vs `admin.zivosmedia.com`).
3. **Payment DB owner (C5):** ecosystem canon strongly indicates the hub `slirphzzwcogdbkeicff`;
   needs explicit confirm before any ZivoPay schema/migration.
4. **`/travel` posture (W7):** public landing vs fully gated.

## How this maps to Codex's roadmaps
- Codex `ZIVO_UI_FIX_ROADMAP.md`: same P0s (admin DNS, `/hotels`, visual-test) — this doc keeps them
  and adds the foundation-first ordering and the dependency graph.
- Codex `PR_ROADMAP.md` (PR 1–12) is the **backend/contract** build order (identity, registry,
  travel↔driver, ZivoPay, chat). This UI roadmap front-loads the **design-system + UX** work that can
  proceed in parallel and that those PRs' UIs will render through (e.g., C1 needs PR-2 identity; C5
  needs PR-5 ZivoPay; C2/W6 need PR-4 travel↔driver contract).
- Codex `LIVE_WEBSITE_UI_AUDIT.md` (updated after this roadmap) adds a consolidated **Top 10**
  (fully covered by W1/W2/W4 + C1–C5 above) and recommends the **`zivodriver.com` landing page as the
  first UI-fix PR**. Reconciliation: that page lives in the separate `zivodriver` repo, so it **can**
  start in parallel with the `zivosmedia` foundation — but to avoid building it twice it should consume
  DS-5 (mirrored tokens), C1 (the real "Continue with Zivosmedia" button), and the fixed `<Button>`
  (DS-1) rather than re-creating the pale auth CTA. Net: keep the P0s (W1/`/hotels`, C3/admin DNS,
  QA/visual-test) ahead of it, then run driver-landing alongside DS-1/DS-3/C1.

## Verification expectations for any PR spawned from this roadmap
Run the local gates before PR: `npm run build`, `npm run verify` (in `zivosmedia`/`Zivo-Admin` as
applicable), and — once QA P0 is fixed — `npm run test:visual` plus `qa:safe-area:all` for the
mobile/tablet viewports this audit used. Re-capture the affected `docs/ui-audit-screenshots/` shots to
prove the fix on `iphone-13`, `ipad`, and `desktop-1440`.
