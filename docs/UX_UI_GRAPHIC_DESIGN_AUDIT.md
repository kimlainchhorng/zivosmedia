# UX/UI & Graphic Design Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files.

> **Correction vs. an earlier draft:** the host landing pages **do exist** (`src/pages/ZivoDriverHome.tsx`, `ZivoBusinessHome.tsx`, `ZivoEmployeeHome.tsx`, `ZivoTravelHome`, software/business pages) and hostname routing is live at `src/App.tsx:1682` (`isCurrentZivoDriverHost()` etc.). A duplicate nested scaffold (`eloquent-liskov-159913/`) caused a false "missing pages" reading; the driver/business/employee landings are **WIP/undeployed**, not absent.

## Design-system maturity

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Color system | ✅ Mature | `src/index.css` (~179 HSL vars; service palettes: flights/hotels/cars/rides/eats/more; light+dark) |
| Typography scale | ✅ Mature | `index.css` display-lg→caption responsive scale; Inter/Inconsolata |
| Component primitives | ✅ Mature | `src/components/ui/` (55 shadcn components + ZIVO variants: rides/eats/glass/hero/ig) |
| Spacing / safe-area | ✅ Mature | Tailwind tokens + `--zivo-safe-*` insets, 44px min touch targets |
| Cards / buttons | ✅ Consistent | `ui/card.tsx`, `ui/button.tsx` (sizes h-10→h-16) |
| Loading / empty / error states | ✅ Good | `ui/skeleton.tsx`, `ui/empty-state.tsx` (tones), `shared/RouteErrorBoundary.tsx` |
| Logo / branding | 🟡 Partial | `ZivoLogo.tsx` single global mark; no per-domain variants |
| Per-domain visual consistency | 🟡 Partial | Host landings exist but are WIP and not yet design-system-aligned across all 8 |

## Cross-app UX components (the big gaps)

| Component | Status | Evidence |
|-----------|--------|----------|
| App switcher (8-domain) | 🔴 Missing | `GlobalDesktopNav.tsx` + `navigation/megaMenuData.ts` are **internal-route** nav only; no links to sibling domains |
| "Continue with Zivosmedia" CTA | 🔴 Missing | grep finds zero occurrences in UI; only chat copy "Use your ZIVO Media account"; `Login.tsx` has no OAuth buttons (sso-auth-contracts fails) |
| ZivoChat support entry (cross-surface) | 🔴 Missing | Chat product complete but no "Open ZivoChat" launcher on travel/software/business/driver surfaces |
| Payment/billing entry | 🟡 Partial | wallet/checkout exist; not surfaced as a consistent entry across domains |
| Cookie banner first-screen block | 🟡 Risk | `CookieConsent.tsx` z-[100], `bottom-[calc(92px + safe)]`; may overlap bottom nav / wrap buttons on narrow notched devices |

## Top gaps
- **P1** Build a shared **app switcher** + **Continue with Zivosmedia** + cross-surface **ZivoChat launcher** (3 shared components deployed to every host).
- **P1** Align the WIP host landings (driver/business/employee) to the design system before deploy.
- **P2** Per-domain logo variants; service-specific empty-state tones; cookie-banner offset hardening on <320px; document tokens in a DESIGN_TOKENS reference.

## Readiness flags
- P0: none (no crash); but cross-app UX gaps block the "super-app" promise.
- P1: app switcher, Continue-with-Zivosmedia, ZivoChat launcher, host-landing polish.
- P2: logo variants, empty-state tones, cookie banner, token docs.

## Maps to roadmap
PR 8 (Continue with Zivosmedia), PR 9 (app switcher), PR 10 (ZivoChat entry), PR 6/7 (business/employee landings), PR 29 (cookie banner + safe area). Vehicle SVG artwork (PR #12 mentioned by owner) is **not mergeable as-is — review later, do not merge blindly.**
