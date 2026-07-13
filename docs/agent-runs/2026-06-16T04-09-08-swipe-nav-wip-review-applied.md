# Swipe-nav WIP review — applied (Claude, with MiMo + DeepSeek)

- date: 2026-06-16T04:09:08Z
- reviewed: uncommitted WIP diff (useTabSwipeNavigation hook, ZivoMobileNav IG redesign, ReelsFeedPage liquid-glass header, ChannelPostCard single-media layout)
- advisors: MiMo (`npm run agent:mimo`, run doc `2026-06-16T04-04-41-…-mimo.md`) + DeepSeek (`deepseek-reasoner` via MCP)
- verify: `npm run update` (type-check + worker type-check + build) — PASS

---

## Applied

1. **View Transition race on rapid swipes** (consensus: MiMo #1 + DeepSeek #2) — `src/hooks/useTabSwipeNavigation.ts`.
   An earlier slide's `finished` handler cleared `data-swipe-nav` while a second
   swipe's transition was still animating, dropping its direction. Fixed with a
   module-level `activeSlideTransitions` counter: set the latest `dir`, count in,
   and only `removeAttribute("data-swipe-nav")` once the LAST transition settles.
   Also switched `delete dataset.swipeNav` → `removeAttribute` (DeepSeek #3).

2. **Icon-only nav a11y** (MiMo #3) — `src/components/app/ZivoMobileNav.tsx`.
   Added `title={label}` to each tab button (hover/long-press tooltip for sighted
   users on small desktop/Electron). `aria-label` already carries label + unread
   count for screen readers; unchanged.

## Considered and rejected

- **MiMo #2 — `overflow:hidden` containers block tab-swipe.** False positive. In
  `startedInHorizontalScroller`, only `overflowX === auto|scroll` returns `true`;
  `hidden`/`clip` already fall through and keep walking up. The proposed change is
  a no-op. Not applied.
- **DeepSeek #1 — wrap `navigate(to)` in `flushSync` for a fresh snapshot.** The
  tab targets are lazy/Suspense routes; `flushSync` around a suspending navigate
  throws "suspended while responding to synchronous input." That regression is
  worse than the minor first-frame snapshot it would fix. Kept the simple pattern.

## Owner verify on a real touch device

- Fast double-swipe on the bottom nav (left then immediately right) → second slide
  animates in the correct direction, no stuck `data-swipe-nav`.
- Swipe inside a horizontal chip rail / stories tray on `/` and `/feed` → still
  scrolls the rail, does NOT change tabs.
