# MiMo run — 2026-06-16T04:04:41.940Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review this UNCOMMITTED work-in-progress diff from the ZIVO media web app (zivosmedia). It adds: (1) a new hook useTabSwipeNavigation for cross-tab horizontal swipe navigation, (2) an Instagram-style redesign of the bottom nav ZivoMobileNav (labels removed, soft active pill), (3) a liquid-glass feed header in ReelsFeedPage, (4) a Telegram-style single-media layout in ChannelPostCard. It ALREADY passes type-check + production build. Find ONLY real correctness/runtime bugs: race conditions, touch-event listener leaks, gesture conflicts (e.g. stealing horizontal scroll/carousels), null/undefined access, accessibility regressions (labels removed from nav), and View Transitions API edge cases. IGNORE pure visual/styling taste. For each finding give: file, the exact area, why it is a bug, and the minimal fix. If nothing is seriously wrong, say so plainly and list at most the top 3 nice-to-haves.
- files: /tmp/zivosmedia-wip-review.txt

---

## Plan

I reviewed every hunk across the six files plus the new `useTabSwipeNavigation.ts` for correctness, race conditions, gesture conflicts, null access, listener leaks, and a11y regressions. I found **one real correctness bug** (view-transition race condition) and **two notable issues** worth fixing. The rest is sound.

---

## Finding 1 — **BUG: View Transition race condition wipes a sibling animation's direction**

**File:** `src/hooks/useTabSwipeNavigation.ts` → `navigateWithSlide()`

**Why it's a bug:**
`data-swipe-nav` is set on `<html>` *before* `startViewTransition()`. If the user swipes twice fast, the first transition's `finished` promise eventually resolves/rejects and its `.then(clear)` runs `delete dataset.swipeNav` — even though the *second* transition is mid-animation and still needs that attribute for its CSS direction. Result: the second slide freezes or snaps to a crossfade mid-animation.

```
Timeline:
  Swipe 1: set data-swipe-nav="left" → start VT1
  Swipe 2: set data-swipe-nav="right" → start VT2 (VT1 aborted)
  VT1.finished rejects → .then(clear) fires → deletes dataset.swipeNav
  ← VT2 CSS loses its direction key, animation breaks
```

**Minimal fix — guard the clear with a staleness check:**

```tsx
// in navigateWithSlide, replace:
const clear = () => {
  delete document.documentElement.dataset.swipeNav;
};

// with:
const clear = () => {
  // Only clear if OUR direction is still active; a newer swipe owns it now.
  if (document.documentElement.dataset.swipeNav === dir) {
    delete document.documentElement.dataset.swipeNav;
  }
};
```

One-line guard, zero risk. Also add `try/catch` around the `clear()` in the `.then()` chain in case the document is gone (Electron/Capacitor edge):

```tsx
void transition.finished
  .catch(() => {})
  .then(() => { try { clear(); } catch { /* noop */ } });
```

---

## Finding 2 — **BUG: `startedInHorizontalScroller` false-negative on `overflow: hidden` containers**

**File:** `src/hooks/useTabSwipeNavigation.ts` → `startedInHorizontalScroller()`

**Why it's a bug:**
The function returns `true` when it finds a `scrollWidth > clientWidth + 4` ancestor with `overflow-x: auto|scroll`. But it never checks for `overflow: hidden`. A `div` with `overflow: hidden` and wider content (e.g. a clipped chip rail or a staged animation container) will match the size test and return `true`, **blocking** tab-swipe — even though that container doesn't scroll and the user has no way to interact with it horizontally.

This is the wrong direction of error. The `data-swipe-grab` attribute already provides the explicit opt-in for carousels; this function should be a permissive safety net, not an overly strict gate.

**Minimal fix — add `overflow: hidden` / `clip` to the skip list:**

```ts
function startedInHorizontalScroller(target: Element | null): boolean {
  let el: Element | null = target;
  while (el && el !== document.body) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 4) {
      const ox = getComputedStyle(el).overflowX;
      // hidden/clip containers clip content but DON'T scroll — ignore them
      if (ox === "hidden" || ox === "clip") {
        el = el.parentElement;
        continue;
      }
      if (ox === "auto" || ox === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}
```

---

## Finding 3 — **A11y regression: visible tab labels removed, icon-only for sighted users**

**File:** `src/components/app/ZivoMobileNav.tsx`

**Why it matters:**
The entire `<span>` with `{label}` text was removed. `aria-label` remains on each `<button>`, so screen-reader users are fine. But **sighted users** — especially on the "Chat" and "Ride" tabs with less-universal icons — now have zero text cues. Instagram gets away with this because its icons are globally recognized (house, magnifier, heart, person); Zivo's "Chat bubble" and "Car" icons are less standard.

**This is a product call, not a code bug**, but it is an accessibility regression per WCAG 2.1 SC 1.4.11 (non-text contrast + identification). At minimum, consider:

- A `title` attribute on each button (shows on long-press/hover, no layout cost).
- Or, a very small tooltip hint that appears on first visit (one-time).

**Minimal no-layout-impact fix:**

```tsx
// On each tab button, add:
title={label}
```

This gives sighted users a hover/long-press tooltip with zero layout change.

---

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | **Bug** | `useTabSwipeNavigation.ts` | View Transition race: `data-swipe-nav` cleared by a stale `finished` handler during a second animation |
| 2 | **Bug** | `useTabSwipeNavigation.ts` | `overflow: hidden` containers block tab swipe incorrectly |
| 3 | **Regression** | `ZivoMobileNav.tsx` | Visible labels removed → icon-only for sighted users (aria-label preserved for SR) |

Everything else — the `ChannelPostCard` single-media layout, the ReelsFeedPage liquid-glass header, the feed `PostMediaStatsOverlay` conditional suppression, the `channelName`/`channelAvatarUrl` prop threading, the CSS view-transition keyframes, the `prefers-reduced-motion` gate, the edge-guard and dominance-ratio swipe heuristics — is correct. No null/undefined access risks, no listener leaks (cleanup returns are paired), no gesture conflicts with feed sub-tab swipes or `data-swipe-grab` carousels.

**Owner must verify:** on a real touch device, do a fast double-swipe (swipe left, then immediately swipe right) on the bottom nav to confirm fix #1. Test swipe inside a horizontally-scrollable chip rail (stories tray) on `/` and `/feed` to confirm fix #2 doesn't break the exclusion.
