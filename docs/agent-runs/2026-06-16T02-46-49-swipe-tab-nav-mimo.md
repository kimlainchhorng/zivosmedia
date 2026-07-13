# Cross-Tab Swipe Navigation — Production Implementation

## 1. Architecture: document-level touch hook

**Agree — lightweight touch-event hook is the right call.** Here's why:

- **framer-motion drag** adds ~30KB, operates on wrapper divs (must contain the route outlet), and fights react-router page transitions. You'd need a `AnimatePresence` + `motion.div` wrapper that intercepts every render. Overkill.
- **Wrapper component** (a div with `onTouchStart` etc.) requires wrapping the entire route outlet, which means either a layout route with an extra DOM node, or wrapping each page. Fragile to maintain and fights with pages that need their own touch handling.
- **Document-level hook** (`addEventListener` on `document`) runs after all child handlers (React's synthetic events fire first in the capture phase but native listeners on `document` fire after). Use `passive: true` on touchstart, `passive: false` on touchmove (to allow `preventDefault` on valid horizontal swipes to suppress browser back/forward gesture), and check conflicts by walking up from `e.target`.

---

## 2. Exclusion selector

```ts
const EXCLUDE_SELECTOR = [
  // Interactive controls
  'input',
  'textarea',
  'select',
  '[contenteditable]',
  '[role="slider"]',
  'button',

  // Explicit opt-out attribute
  '[data-no-tab-swipe]',

  // Horizontal swipeable carousels / image galleries
  '[data-swipe-grab="true"]',
  '[data-swipe-grab]',
  '.swiper',
  '.swiper-slide',
  '[role="tablist"]',           // sub-tab strip in feed

  // Horizontal scrollable trays (stories, etc.)
  '[data-horizontal-scroll]',

  // Range inputs, native sliders
  'input[type="range"]',

  // The nav bar itself
  'nav[data-bottom-nav]',

  // Swipe-back edge container
  '[data-swipe-back]',
].join(',');
```

Walk-up logic:

```ts
function isExcluded(target: EventTarget | null): boolean {
  let el = target as Element | null;
  while (el && el !== document.documentElement) {
    if (el.matches?.(EXCLUDE_SELECTOR)) return true;
    el = el.parentElement;
  }
  return false;
}
```

---

## 3. Edge-only vs full-width

**Edge-only (~40px) is the wrong choice here.** Here's the trade-off:

| Approach | Pros | Cons |
|---|---|---|
| Edge-only (40px) | Avoids all conflicts with Feed sub-tabs, carousels, etc. | Very discoverable only if user knows. iOS back gesture is a different mental model (back = history), not tab switching. Users won't find it. |
| Full-width | Discoverable, matches TikTok/IG expectations | Must coexist with Feed's sub-tab swipe |

**Recommendation: Full-width, but with the Feed page getting priority.** The hook checks: "Am I on `/feed`?" If yes, the hook only fires when the Feed sub-tab swipe has already consumed its gesture (i.e., the sub-tab is at boundary and can't advance). The simplest robust approach:

- The hook is **always** attached.
- On `/feed`, the hook has a **wider margin of indifference** — it defers to the Feed sub-tab handler which fires first (React synthetic events fire before native document listeners when both are `passive: false`, but the Feed handler uses `touchstart`/`touchend` on its own element). Since the Feed handler calls `preventDefault()` when it consumes the swipe, the hook can detect that via a flag.
- Alternatively (simpler): On `/feed`, the hook only triggers when `|dx|` exceeds a **higher threshold** (e.g., 80px vs 52px) AND `|dy|` ratio is stricter, effectively letting the sub-tab swipe always win for short/medium swipes. This is what Instagram actually does — cross-tab swipe on the Feed page requires a more deliberate, longer swipe.

**Final approach for `/feed`:** inject a CSS variable or data attribute from the Feed page when the sub-tab is at the leftmost/rightmost boundary, and the hook reads it. But that couples the hook to Feed internals. **Simpler:** just raise the threshold on `/feed` so short swipes go to sub-tabs and long swipes go to tab nav. This matches TikTok's behavior.

---

## 4. Thresholds

```ts
const THRESHOLDS = {
  minDx: 50,               // minimum horizontal distance in px
  dxToDyRatio: 1.5,        // |dx| must be >= 1.5 * |dy| to be "horizontal"
  maxDuration: 400,         // ms — a flick gesture
  velocityMin: 0.3,         // px/ms minimum velocity for a "flick"
  // Raised thresholds for Feed page (sub-tab swipe has priority)
  feedMinDx: 80,
  feedDxToDyRatio: 2.0,
} as const;
```

---

## 5. Animation approach

**Instant `navigate()` with a lightweight CSS transition.** Here's why:

- `react-router` v6/v7 has no built-in transition API that works with history push.
- `View Transitions API` is the lightest zero-dependency option (Chrome 111+, Safari 18+, all mobile PWA targets). It hooks into `document.startViewTransition()`.
- Fallback: instant navigate, no animation (minority of users on old Safari).

```ts
function navigateWithTransition(navigate: ReturnType<typeof useNavigate>, to: string) {
  if ('startViewTransition' in document) {
    (document as any).startViewTransition(() => {
      navigate(to, { replace: false });
    });
  } else {
    navigate(to, { replace: false });
  }
}
```

Then in CSS:
```css
::view-transition-old(root) {
  animation: slide-out 200ms ease-out;
}
::view-transition-new(root) {
  animation: slide-in 200ms ease-out;
}
@keyframes slide-out {
  to { transform: translateX(-30%); opacity: 0.5; }
}
@keyframes slide-in {
  from { transform: translateX(30%); opacity: 0.5; }
}
```

For directional awareness (slide left vs right), pass the direction into a CSS custom property before calling `startViewTransition`.

---

## 6. All 6 tabs or only 3?

**All 6.** The user expectation in IG/TikTok is that swiping works across ALL bottom nav tabs. The nav bar shows 6 icons; swiping should match. The Chat and Account pages have no conflicting horizontal gestures, so there's zero reason to exclude them. Including all 6 also means the Feed sub-tab swipe conflict is the *only* edge case to handle, keeping the logic simple.

---

## 7. Full Implementation

```ts
// hooks/useTabSwipeNavigation.ts
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Configuration ──────────────────────────────────────────────

interface TabSwipeConfig {
  /** Ordered array of paths matching bottom-nav tab order */
  tabPaths: readonly string[];
  /** Override the current pathname (defaults to useLocation) */
  pathname?: string;
}

// ─── Thresholds ─────────────────────────────────────────────────

const THRESHOLDS = {
  minDx: 50,
  dxToDyRatio: 1.5,
  maxDuration: 400,
  velocityMin: 0.3,
  // Raised on /feed so sub-tab swipe gets priority
  feedMinDx: 80,
  feedDxToDyRatio: 2.0,
} as const;

// ─── Exclusion selector ─────────────────────────────────────────

const EXCLUDE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]',
  '[role="slider"]',
  '[role="tablist"]',
  'button',
  '[data-no-tab-swipe]',
  '[data-swipe-grab="true"]',
  '[data-swipe-grab]',
  '.swiper',
  '.swiper-slide',
  '[data-horizontal-scroll]',
  'input[type="range"]',
  'nav[data-bottom-nav]',
  '[data-swipe-back]',
].join(', ');

function isExcludedTarget(target: EventTarget | null): boolean {
  let el = target as Element | null;
  let depth = 0;
  const MAX_DEPTH = 15; // safety bound
  while (el && el !== document.documentElement && depth < MAX_DEPTH) {
    if (el.matches?.(EXCLUDE_SELECTOR)) return true;
    el = el.parentElement;
    depth++;
  }
  return false;
}

// ─── Navigation with View Transition ────────────────────────────

function navigateWithSlide(
  navigateFn: ReturnType<typeof useNavigate>,
  to: string,
  direction: 'left' | 'right',
) {
  const vt = document as any;

  if (typeof vt.startViewTransition === 'function') {
    // Set directional CSS custom property for animation
    document.documentElement.style.setProperty(
      '--swipe-direction',
      direction === 'left' ? '-1' : '1',
    );

    vt.startViewTransition(() => {
      navigateFn(to);
    });
  } else {
    navigateFn(to);
  }
}

// ─── The Hook ───────────────────────────────────────────────────

export function useTabSwipeNavigation({ tabPaths, pathname: pathnameProp }: TabSwipeConfig) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = pathnameProp ?? location.pathname;

  // Refs for touch tracking — avoid re-renders entirely
  const touchRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    startTime: 0,
    active: false,
  });

  // Ref to latest navigate function to avoid stale closure
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Ref to latest pathname
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Ref to latest tabPaths
  const tabPathsRef = useRef(tabPaths);
  tabPathsRef.current = tabPaths;

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only single-touch gestures
      if (e.touches.length !== 1) {
        touchRef.current.active = false;
        return;
      }

      // Skip if target is in an excluded zone
      if (isExcludedTarget(e.target)) {
        touchRef.current.active = false;
        return;
      }

      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        active: true,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const state = touchRef.current;
      if (!state.active) return;
      state.active = false;

      // Must be single touch end
      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      const duration = Date.now() - state.startTime;

      // ── Determine thresholds based on current page ──────────
      const isFeedPage = pathnameRef.current === '/feed';
      const minDx = isFeedPage ? THRESHOLDS.feedMinDx : THRESHOLDS.minDx;
      const dxRatio = isFeedPage ? THRESHOLDS.feedDxToDyRatio : THRESHOLDS.dxToDyRatio;

      // ── Threshold checks ────────────────────────────────────
      if (Math.abs(dx) < minDx) return;
      if (Math.abs(dx) < Math.abs(dy) * dxRatio) return;
      if (duration > THRESHOLDS.maxDuration) return;

      // Velocity check (helps distinguish deliberate swipe from drag)
      const velocity = Math.abs(dx) / duration;
      if (velocity < THRESHOLDS.velocityMin) return;

      // ── Determine direction and target tab ──────────────────
      const paths = tabPathsRef.current;
      const currentIndex = paths.indexOf(pathnameRef.current);

      // Current page not in the tab list — bail
      if (currentIndex === -1) return;

      let targetIndex: number;

      if (dx < 0) {
        // Swipe left → next tab (higher index)
        targetIndex = currentIndex + 1;
      } else {
        // Swipe right → previous tab (lower index)
        targetIndex = currentIndex - 1;
      }

      // Boundary check
      if (targetIndex < 0 || targetIndex >= paths.length) return;
      if (targetIndex === currentIndex) return;

      const direction: 'left' | 'right' = dx < 0 ? 'left' : 'right';
      navigateWithSlide(navigateRef.current, paths[targetIndex], direction);
    };

    // Prevent browser's horizontal back/forward navigation gesture
    // on valid cross-tab swipes. We can't know in touchstart, so we
    // prevent on touchmove when the gesture is clearly horizontal.
    const onTouchMove = (e: TouchEvent) => {
      if (!touchRef.current.active || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = touch.clientY - touchRef.current.startY;

      // If clearly horizontal, prevent default to block browser back gesture
      // This won't block vertical scroll since we only prevent when |dx| > |dy|
      if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // Note: this listener must be non-passive to call preventDefault
        e.preventDefault();
      }
    };

    // ── Attach listeners ──────────────────────────────────────
    // touchstart: passive (we never preventDefault on start)
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    // touchmove: non-passive so we can preventDefault on horizontal swipes
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    // touchend: passive
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
    // Intentionally NOT dependent on `pathname` — we use refs.
    // The effect only needs to mount/unmount once.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
```

### CSS for View Transitions (directional)

```css
/* styles/view-transitions.css */

/* Default: no-op */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 220ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Swiping left (content moves left, old page exits left) */
:root:root { /* double-specificity override if needed */
  --swipe-direction: 0;
}

::view-transition-old(root) {
  animation-name: vt-slide-out;
}

::view-transition-new(root) {
  animation-name: vt-slide-in;
}

@keyframes vt-slide-out {
  to {
    transform: translateX(calc(var(--swipe-direction, -1) * 30%));
    opacity: 0.4;
  }
}

@keyframes vt-slide-in {
  from {
    transform: translateX(calc(var(--swipe-direction, -1) * -30%));
    opacity: 0.4;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### Usage in the app shell

```tsx
// App.tsx or wherever the layout shell lives
import { useTabSwipeNavigation } from './hooks/useTabSwipeNavigation';

const TAB_PATHS = ['/', '/feed', '/reels', '/rides/hub', '/chat', '/profile'] as const;

function AppShell() {
  useTabSwipeNavigation({ tabPaths: TAB_PATHS });

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/rides/hub" element={<RideHub />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      {/* Bottom nav must have this data attribute so swipe skips it */}
      <nav data-bottom-nav className="fixed bottom-0 inset-x-0 z-50">
        {/* ... */}
      </nav>
    </div>
  );
}
```

### Optimizing the touchmove for scroll performance

The `{ passive: false }` on `touchmove` will cause a console warning in Chrome because it can block scrolling. To avoid this and only call `preventDefault` when needed, use a **conditional passive approach** with `AbortController` or just live with the warning (it's harmless). The cleaner alternative:

```ts
// Replace the touchmove listener with this pattern:
// Use a native event listener with passive:false only once.
// The browser warning is cosmetic — we're only preventing on
// clearly horizontal gestures, so vertical scroll is never blocked.
```

This is a known trade-off. Chrome DevTools warns about it, but since we only `preventDefault` when `|dx| > 20 && |dx| > |dy| * 1.5`, vertical scrolling is never impacted. This is the same approach used by `react-swipeable`, `use-gesture`, and every mobile gesture library.

---

### Summary of decisions

| Question | Decision |
|---|---|
| Architecture | Document-level `addEventListener` hook with refs |
| Exclusion | `element.closest()` walk with comprehensive selector list |
| Edge vs full-width | Full-width, raised thresholds on `/feed` |
| Thresholds | 50px min, 1.5x ratio, 400ms max, 0.3px/ms velocity. Feed: 80px, 2.0x |
| Animation | `document.startViewTransition()` with CSS directional slides |
| Tabs | All 6 |
| Conflict with Feed | Higher thresholds on `/feed` — short/medium swipes go to sub-tabs, deliberate long swipes cross to adjacent tab |