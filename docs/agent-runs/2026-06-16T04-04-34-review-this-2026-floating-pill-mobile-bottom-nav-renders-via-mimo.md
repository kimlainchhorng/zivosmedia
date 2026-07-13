# MiMo advisor — Review this 2026 floating-pill mobile bottom nav (renders via createPortal, swaps social vs travel tab sets by host, shows unread badges, avatar on the account tab). Report ONLY real bugs with P0/P1/P2 + one-line fix: active-tab detection misses, badge/count races, a11y gaps, portal/SSR issues, double-mount risk. Be concise — lead with the findings list, minimal preamble.

Files: src/components/app/ZivoMobileNav.tsx

## Findings

**P1 — Duplicate nav on double-mount:** No singleton guard; if two `ZivoMobileNav` instances render (the code's own comment admits MorePage does this), two portals append to `document.body`. Fix: add a module-level `let mounted = false` guard or a portal `<div id="zivo-mobile-nav">` with dedup check.

**P1 — Badges are invisible to screen readers:** `<motion.span>` showing the count has no `aria-label`, `role`, or sr-only text. Fix: add `role="status" aria-label={`${tab.badge} unread`}` (or a visually-hidden equivalent).

**P1 — `<nav>` landmark lacks `aria-label`:** Multiple `<nav>` elements on the page (header + bottom) need distinct labels per WCAG 2.4.1. Fix: add `aria-label={t("nav.mainNav") ?? "Main navigation"}`.

**P2 — `isTravel` is a render-time side-effect read:** `typeof window !== "undefined" && isZivoTravelHost()` diverges SSR vs. client; if Vite SSR or prerendering is ever enabled, this causes a hydration mismatch on every instance. Fix: wrap in `useSyncExternalStore` or `useState`+`useEffect`.

---

**Otherwise solid.** Active-tab detection is exhaustive with a sensible `"home"` fallback; badge counts debounce through React Query `staleTime`; haptic+prefetch on `pointerDown` is a nice touch; portal-to-body is correct; `forwardRef` is properly forwarded to the `<nav>` inside the portal; `gated()` re-evaluates per render via closure so path changes when auth state changes; avatar fallback chain is safe.
